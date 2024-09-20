import { assert } from "../components/utils/assert";
import { ipcMain } from "electron";
import { WHISPER_IPC_CHANNELS } from "./IPC";
import { getWhisperModelName, getWhisperModelPath } from "@/utils/whisperModel";
import { UserPreferencesDbService } from "@/backend/db";

// Depends on addon.cc definition from STTAddon::Init
type STTWhisperStreamingModule = {
  start: () => void;
  stop: () => void;
  reconfigure: (mPath: string, mLanguageId: number) => number;
  addAudioData: (data: Float32Array) => void;
  clearAudioData: () => void;
  getTranscribedText: () => string;
};
export function registerWhisperIPCHandler(
  sttWhisperStreamingModule: STTWhisperStreamingModule,
): void {
  ipcMain.handle(WHISPER_IPC_CHANNELS["WHISPER_CONFIGURE"], (_event, data) => {
    console.log("[ whisperIPC ] New model configuration received");

    assert.strictEqual(typeof data === "object", true);
    assert.strictEqual(typeof data.mLanguageId === "number", true);

    const whisperModelName = getWhisperModelName(data.mLanguageId);
    const whisperModelPath = getWhisperModelPath(whisperModelName);

    UserPreferencesDbService.updateUserPreferences({
      speechRecognitionLanguageId: data.mLanguageId,
    });

    sttWhisperStreamingModule.reconfigure(whisperModelPath, data.mLanguageId);
  });
  ipcMain.handle(WHISPER_IPC_CHANNELS["WHISPER_START"], (_event, _data) => {
    console.log("[ whisperIPC ] Starting whisper ipc handler called.");
    sttWhisperStreamingModule.start();
  });
  ipcMain.handle(WHISPER_IPC_CHANNELS["WHISPER_STOP"], (_event, _data) => {
    console.log("[ whisperIPC ] Stopping whisper ipc handler called.");
    sttWhisperStreamingModule.stop();
  });
  ipcMain.handle(WHISPER_IPC_CHANNELS["WHISPER_ADD_AUDIO"], (_event, data) => {
    assert.strictEqual(data instanceof Float32Array, true);

    if (data instanceof Float32Array) {
      sttWhisperStreamingModule.addAudioData(data);
    } else {
      console.error(
        "[ main.ipcHandler ] Incoming data for `whisper:add_audio` is not a Float32Array",
      );
    }
  });
  ipcMain.handle(
    WHISPER_IPC_CHANNELS["WHISPER_GET_TRANSCRIBED_TEXT"],
    (_event, _data) => {
      return sttWhisperStreamingModule.getTranscribedText();
    },
  );
  ipcMain.handle(
    WHISPER_IPC_CHANNELS["WHISPER_CLEAR_AUDIO"],
    (_event, _data) => {
      sttWhisperStreamingModule.clearAudioData();
    },
  );
}
