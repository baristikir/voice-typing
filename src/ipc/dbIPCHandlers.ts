import { TranscriptsDbService } from "../backend/db";
import { assert } from "../components/utils/assert";
import { ipcMain } from "electron";

export const DB_IPC_CHANNELS = {
  TRANSCRIPT_GET_ALL: "db:transcript_getAll",
  TRANSCRIPT_GET: "db:transcript_get",
  TRANSCRIPT_CREATE: "db:transcript_create",
  TRANSCRIPT_UPDATE: "db:transcript_update",
  TRANSCRIPT_DELETE: "db:transcript_delete",
} as const;

export function registerDbIPCHandler() {
  ipcMain.handle(DB_IPC_CHANNELS["TRANSCRIPT_GET_ALL"], (_event, _data) => {
    console.log("[ dbIPC ] Querying transcripts from database.");
    const transcripts = TranscriptsDbService.getAllTranscripts();
    return transcripts;
  });

  ipcMain.handle(DB_IPC_CHANNELS["TRANSCRIPT_GET"], (_event, data) => {
    console.log("[ dbIPC ] Querying transcript by id from database.");

    const transcript = TranscriptsDbService.getTranscriptById(data);

    assert.strictEqual(typeof transcript.id === "number", true);
    assert.strictEqual(typeof transcript.title === "string", true);
    assert.strictEqual(typeof transcript.text === "string", true);
    assert.strictEqual(typeof transcript.createdAt === "string", true);
    assert.strictEqual(typeof transcript.updatedAt === "string", true);

    return transcript;
  });

  ipcMain.handle(DB_IPC_CHANNELS["TRANSCRIPT_CREATE"], (_event, data) => {
    console.log("[ dbIPC ] Inserting new transcript record into database.");

    assert.strictEqual(typeof data.title === "string", true);
    assert.strictEqual(typeof data.text === "string", true);

    const transcripts = TranscriptsDbService.createTranscript(
      data.title,
      data.ttext,
    );

    return transcripts;
  });
}
