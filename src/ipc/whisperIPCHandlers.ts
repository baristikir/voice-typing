import { assert } from "../components/utils/assert";
import { ipcMain } from "electron";
import { WHISPER_IPC_CHANNELS } from "./IPC";

// Depends on addon.cc definition from STTAddon::Init
type STTWhisperStreamingModule = {
  start: () => void;
  stop: () => void;
  addAudioData: (data: Float32Array) => void;
  getTranscribedText: () => string;
};
export function registerWhisperIPCHandler(
  sttWhisperStreamingModule: STTWhisperStreamingModule,
): void {
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
}
