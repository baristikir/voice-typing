import { ipcMain } from "electron";
import { DB_IPC_CHANNELS } from "./IPC";
import { UserPreferencesDbService } from "@/backend/db";
import { assert } from "@/components/utils/assert";

export function registerPreferencesIPCHandler() {
  ipcMain.handle(DB_IPC_CHANNELS["PREFERENCES_GET"], (_event, _data) => {
    console.log("[ dbIPC ] Querying preferences from the database.");
    const preferences = UserPreferencesDbService.getUserPreferences();
    return preferences;
  });

  ipcMain.handle(DB_IPC_CHANNELS["PREFERENCES_UPDATE"], (_event, data) => {
    console.log(
      "[ dbIPC ] Updating preferences to database.",
      data,
    );

    if ("speechRecognitionLanguage" in data) {
      assert.strictEqual(
        typeof data.speechRecognitionLanguage === "string",
        true,
      );
    }
    if ("pushToTalkEnabled" in data) {
      assert.strictEqual(typeof data.pushToTalkEnabled === "boolean", true);
    }
    if ("deviceId" in data) {
      assert.strictEqual(typeof data.deviceId === "string", true);
    }

    const updatedPreferences = UserPreferencesDbService.updateUserPreferences(
      data,
    );
    return updatedPreferences;
  });
}
