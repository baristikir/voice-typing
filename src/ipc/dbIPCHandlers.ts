import { TranscriptsDbService } from "../backend/db";
import { assert } from "../components/utils/assert";
import { ipcMain } from "electron";
import { DB_IPC_CHANNELS } from "./IPC";

export function registerDbIPCHandler() {
  ipcMain.handle(DB_IPC_CHANNELS["TRANSCRIPT_GET_ALL"], (_event, _data) => {
    console.log("[ dbIPC ] Querying transcripts from database.");
    const transcripts = TranscriptsDbService.getAllTranscripts();
    return transcripts;
  });

  ipcMain.handle(DB_IPC_CHANNELS["TRANSCRIPT_GET"], (_event, data) => {
    console.log("[ dbIPC ] Querying transcript by id from database.");

    const transcript = TranscriptsDbService.getTranscriptById(data);

    console.log(transcript);
    assert.strictEqual(typeof transcript.id === "number", true);
    assert.strictEqual(typeof transcript.title === "string", true);

    return transcript;
  });

  ipcMain.handle(DB_IPC_CHANNELS["TRANSCRIPT_CREATE"], (_event, data) => {
    console.log(
      "[ dbIPC ] Inserting new transcript record into database.",
      data,
    );

    assert.strictEqual(typeof data.title === "string", true);

    const transcript = TranscriptsDbService.createTranscript(
      data.title,
      data.payload,
    );

    return transcript;
  });

  ipcMain.handle(DB_IPC_CHANNELS["TRANSCRIPT_UPDATE"], (_event, data) => {
    console.log(
      "[ dbIPC ] Updating transcript record in database.",
      data,
    );

    assert.strictEqual(typeof data.id === "number", true);
    assert.strictEqual(
      data.title
        ? typeof data.title === "string"
        : typeof data.title === "undefined",
      true,
    );
    assert.strictEqual(
      data.contents
        ? typeof data.contents === "object"
        : typeof data.contents === "undefined",
      true,
    );

    const transcript = TranscriptsDbService.updateTranscript(
      data.id,
      data.title,
      data.contents,
    );

    return transcript;
  });

  ipcMain.handle(
    DB_IPC_CHANNELS["TRANSCRIPT_SAVE_CONTENTS"],
    (_event, data) => {
      console.log(
        "[ dbIPC ] Saving transcript contents to database.",
        data,
      );

      assert.strictEqual(typeof data.id === "number", true);

      const status = TranscriptsDbService.saveTranscriptContents(
        data.id,
        data.contents,
      );

      return status;
    },
  );

  ipcMain.handle(DB_IPC_CHANNELS["TRANSCRIPT_DELETE"], (_event, data) => {
    console.log("[ dbIPC ] Deleting transcript from database.");
    return TranscriptsDbService.deleteTranscript(data);
  });
}
