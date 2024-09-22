import { dialog, ipcMain } from "electron";
import { DIALOG_IPC_CHANNELS } from "./IPC";
import { assert } from "@/components/utils/assert";

export function registerDialogIPCHandler() {
  ipcMain.handle(
    DIALOG_IPC_CHANNELS["DIALOG_OPEN"],
    async (_event, data) => {
      console.log("[ dialogIPC ] Dialog file picker opening.");
      const filePath = await dialog.showOpenDialog({
        ...data,
      });
      return filePath;
    },
  );
}
