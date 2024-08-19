import { app } from "electron";
import SQL from "better-sqlite3";
import path from "path";

export let db: SQL.Database;

export async function setupDatabase(): Promise<void> {
  if (!db) {
    const dbPath = path.join(app.getPath("userData"), "database.sqlite");
    console.log(" [ DB ] dbPath: ", dbPath);
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
        text TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
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

interface Transcript {
  id: number;
  title: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ITranscriptsDbService {
  getAllTranscripts(): Transcript[];
  getTranscriptById(id: number): Transcript;
  createTranscript(title: string, text: string): Transcript;
  updateTranscript(id: number, title?: string, text?: string): Transcript;
  deleteTranscript(id: number): boolean;
}

export const TranscriptsDbService: ITranscriptsDbService = {
  getAllTranscripts(): Transcript[] {
    const stmt = db.prepare(
      "SELECT * FROM transcripts ORDER BY createdAt DESC",
    );
    return stmt.all() as Transcript[];
  },
  getTranscriptById(id: number): Transcript {
    const stmt = db.prepare("SELECT * FROM transcripts WHERE id = ?");
    return stmt.get(id) as Transcript;
  },
  createTranscript(title: string, text: string): Transcript {
    const stmt = db.prepare(
      "insert into transcripts (title, text) values (?, ?)",
    );
    return stmt.run(title, text) as unknown as Transcript;
  },
  updateTranscript(id: number, title?: string, text?: string): Transcript {
    const stmt = db.prepare(
      "UPDATE transcripts SET title = ?, text = ? WHERE id = ?",
    );
    return stmt.run(title, text, id) as unknown as Transcript;
  },
  deleteTranscript(id: number): boolean {
    const stmt = db.prepare("DELETE FROM transcripts WHERE id = ?");
    const status = stmt.run(id);
    return !!status;
  },
};
