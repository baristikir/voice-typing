import { app } from "electron";
import SQL from "better-sqlite3";
import path from "path";
import { Transcript, TranscriptContent } from "@/shared/models";

export let db: SQL.Database;

export async function setupDatabase(): Promise<void> {
  if (!db) {
    const dbPath = path.join(app.getPath("userData"), "database.sqlite");
    db = new SQL(dbPath, { verbose: console.log });
    clearDatabase();
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
        content_type TEXT CHECK(content_type IN ('p', 'h1', 'br')),
        order_num INTEGER,
        FOREIGN KEY (transcript_id) REFERENCES transcripts(id) ON DELETE CASCADE
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
  ): Transcript;
  updateTranscript(
    id: number,
    title?: string,
    contents?: UpdateTranscriptContent[],
  ): Transcript;
  deleteTranscript(id: number): boolean;
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
    title: string,
  ): Transcript {
    const insertTranscriptStmt = db.prepare(
      "INSERT INTO transcripts (title) VALUES (?)",
    );

    const transcript = db.transaction((title) => {
      const { lastInsertRowid } = insertTranscriptStmt.run(title);
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
