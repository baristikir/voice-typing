import { app } from "electron";
import SQL from "better-sqlite3";
import path from "path";
import {
  Transcript,
  TranscriptContent,
  UserPreferences,
} from "@/shared/models";
import { TranscribedSegments } from "@/shared/ipcPayloads";
import cuid from "cuid";

export let db: SQL.Database;

export async function setupDatabase(): Promise<void> {
  if (!db) {
    const dbPath = path.join(app.getPath("userData"), "database.sqlite");
    db = new SQL(dbPath, { verbose: console.log });
    initDatabase();
  }
}

export function closeDatabase(): void {
  db.close();
}

function initDatabase() {
  db.exec(`
      CREATE TABLE IF NOT EXISTS transcripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

  db.exec(`
      CREATE TABLE IF NOT EXISTS transcript_contents (
        id TEXT PRIMARY KEY,
        transcript_id INTEGER,
        content TEXT,
        content_type TEXT CHECK(content_type IN ('text', 'headline', 'linebreak')),
        order_num INTEGER,
        FOREIGN KEY (transcript_id) REFERENCES transcripts(id) ON DELETE CASCADE
      )
    `);

  db.exec(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        speech_recognition_language_id INTEGER DEFAULT 0,
        push_to_talk_enabled BOOLEAN DEFAULT FALSE
      )
    `);

  db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_transcripts_timestamp
      AFTER UPDATE ON transcripts
      BEGIN
        UPDATE transcripts SET updatedAt = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
      END
    `);

  db.exec(`
      INSERT OR IGNORE INTO user_preferences (id) VALUES (1)
    `);
}

export function clearDatabase() {
  const clear = db.transaction(() => {
    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();

    db.prepare(`PRAGMA foreign_keys = OFF`).run();

    tables.forEach((table: any) => {
      db.prepare(`DROP TABLE IF EXISTS ${table.name}`).run();
    });

    db.prepare("PRAGMA foreign_keys = ON").run();
  });

  clear();
  initDatabase();
}

interface IUserPreferencesDbService {
  getUserPreferences(): UserPreferences;
  updateUserPreferences(preferences: Partial<UserPreferences>): UserPreferences;
}

export const UserPreferencesDbService: IUserPreferencesDbService = {
  getUserPreferences() {
    const stmt = db.prepare(`
          SELECT speech_recognition_language_id, push_to_talk_enabled
          FROM user_preferences
          WHERE id = 1 
        `);

    const row = stmt.get() as any;
    return {
      speechRecognitionLanguageId: row.speech_recognition_language_id,
      pushToTalkEnabled: Boolean(row.push_to_talk_enabled),
    };
  },
  updateUserPreferences(preferences) {
    const updateStmt = db.prepare(`
          UPDATE user_preferences
          SET speech_recognition_language_id = COALESCE(?, speech_recognition_language_id),
              push_to_talk_enabled = COALESCE(?, push_to_talk_enabled)
          WHERE id = 1            
        `);

    db.transaction(() => {
      updateStmt.run(
        preferences.speechRecognitionLanguageId,
        preferences.pushToTalkEnabled,
      );
    })();

    return this.getUserPreferences();
  },
};

type UpdateTranscriptContent =
  & (TranscriptContent | Omit<TranscriptContent, "order">)
  & {
    actionKind: "insert" | "update" | "delete";
  };
interface ITranscriptsDbService {
  getAllTranscripts(): Transcript[];
  getTranscriptById(id: number): Transcript;
  createTranscript(
    title: string,
    payload: TranscribedSegments,
  ): Transcript;
  updateTranscript(
    id: number,
    title?: string,
    contents?: UpdateTranscriptContent[],
  ): Transcript;
  deleteTranscript(id: number): boolean;
  saveTranscriptContents(
    transcriptId: number,
    contents: TranscriptContent[],
  ): boolean;
}

export const TranscriptsDbService: ITranscriptsDbService = {
  getAllTranscripts(): Transcript[] {
    const stmt = db.prepare(`
       SELECT t.*, tc.id as content_id, tc.content, tc.order_num, tc.content_type
       FROM transcripts t
       LEFT JOIN transcript_contents tc ON t.id = tc.transcript_id
       ORDER BY t.createdAt DESC, tc.order_num ASC 
      `);
    const rows = stmt.all();
    return groupTranscriptContent(rows);
  },
  getTranscriptById(id: number): Transcript {
    const stmt = db.prepare(`
       SELECT t.*, tc.id as content_id, tc.content, tc.order_num, tc.content_type
       FROM transcripts t
       LEFT JOIN transcript_contents tc ON t.id = tc.transcript_id
       WHERE t.id = ?
       ORDER BY t.createdAt DESC, tc.order_num ASC 
      `);
    const rows = stmt.all(id);
    return groupTranscriptContent(rows)[0];
  },
  createTranscript(
    title,
    payload,
  ) {
    const insertTranscriptStmt = db.prepare(
      "INSERT INTO transcripts (title) VALUES (?)",
    );

    const insertContentStmt = db.prepare(`
        INSERT INTO transcript_contents (transcript_id, id, content, content_type, order_num)
        VALUES (?, ?, ?, ?, ?)
      `);

    const transcript = db.transaction((title) => {
      const { lastInsertRowid } = insertTranscriptStmt.run(title);
      if (payload && payload.segments.length > 0) {
        for (let i = 0; i < payload.segments.length; i++) {
          const segment = payload.segments[i];
          insertContentStmt.run(
            lastInsertRowid,
            cuid(),
            segment.text,
            "text",
            i,
          );
        }
      }
      return TranscriptsDbService.getTranscriptById(lastInsertRowid as number);
    });

    return transcript(title);
  },
  updateTranscript(id, title, contents): Transcript {
    const updateTranscriptStmt = db.prepare(`
        UPDATE transcripts SET title = ? WHERE id = ?
      `);

    const updateContentStmt = db.prepare(`
        UPDATE transcript_contents
        SET content = ?, content_type = ?
        WHERE id = ? AND transcript_id =?
      `);

    const insertContentStmt = db.prepare(`
        INSERT INTO transcript_contents (transcript_id, id, content, content_type, order_num)
        VALUES (?, ?, ?, ?, ?)
      `);

    const deleteContentStmt = db.prepare(`
        DELETE FROM transcript_contents
        WHERE id = ? AND transcript_id = ?
      `);

    const data = db.transaction(() => {
      if (title) {
        updateTranscriptStmt.run(title, id);
      }

      if (contents && contents.length > 0) {
        for (const content of contents) {
          switch (content.actionKind) {
            case "insert":
              insertContentStmt.run(
                id,
                content.id,
                content.content,
                content.type,
                (content as TranscriptContent).order,
              );
              break;
            case "update":
              updateContentStmt.run(
                content.content,
                content.type,
                content.id,
                id,
              );
              break;
            case "delete":
              deleteContentStmt.run(
                content.id,
                id,
              );
              break;
          }
        }
      }

      return TranscriptsDbService.getTranscriptById(id);
    });

    return data();
  },
  deleteTranscript(id: number): boolean {
    const stmt = db.prepare("DELETE FROM transcripts WHERE id = ?");
    const status = stmt.run(id);
    return status.changes === 1;
  },
  saveTranscriptContents(transcriptId, contents) {
    const clearContentsStmt = db.prepare(`
          DELETE FROM transcript_contents WHERE transcript_id = ?
        `);

    const insertContentStmt = db.prepare(`
          INSERT INTO transcript_contents (transcript_id, id, content, content_type, order_num)
          VALUES (?, ?, ?, ?, ?)
        `);

    const saveContents = db.transaction(() => {
      clearContentsStmt.run(transcriptId);

      contents.forEach((content, index) => {
        insertContentStmt.run(
          transcriptId,
          content.id,
          content.content,
          content.type,
          content.order,
        );
      });
    });

    try {
      saveContents();
      return true;
    } catch (error) {
      console.error(
        "[ TranscriptDbService ]: Error saving transcript contents: ",
        error,
      );
      return false;
    }
  },
};

// Utility Functions
function groupTranscriptContent(rows: any[]): Transcript[] {
  const transcripts: Record<number, Transcript> = {};

  for (const row of rows) {
    if (!transcripts[row.id]) {
      transcripts[row.id] = {
        id: row.id,
        title: row.title,
        contents: [],
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      };
    }

    if (row.content_id) {
      transcripts[row.id].contents.push({
        id: row.content_id,
        content: row.content,
        order: row.order_num,
        type: row.content_type,
      });
    }
  }

  return Object.values(transcripts);
}
