import { assert } from "../components/utils/assert";
import { ipcMain } from "electron";

export const IPC_CHANNELS = {
  WHISPER_START: "whisper:start",
  WHISPER_STOP: "whisper:stop",
  WHISPER_ADD_AUDIO: "whisper:add_audio",
  WHISPER_GET_TRANSCRIPTION: "whisper:get_transcription",
} as const;

type STTWhisperStreamingModule = {
  start: () => void;
  stop: () => void;
  addAudioData: (data: Float32Array) => void;
  getTranscription: () => string;
};
export function registerWhisperIPCHandler(
  sttWhisperStreamingModule: STTWhisperStreamingModule,
): void {
  ipcMain.handle(IPC_CHANNELS["WHISPER_START"], (_event, _data) => {
    console.log("[ whisperIPC ] Starting whisper ipc handler called.");
    sttWhisperStreamingModule.start();
  });
  ipcMain.handle(IPC_CHANNELS["WHISPER_STOP"], (_event, _data) => {
    console.log("[ whisperIPC ] Stopping whisper ipc handler called.");
    sttWhisperStreamingModule.stop();
  });
  ipcMain.handle(IPC_CHANNELS["WHISPER_ADD_AUDIO"], (_event, data) => {
    assert.strictEqual(data instanceof Float32Array, true);

    if (data instanceof Float32Array) {
      sttWhisperStreamingModule.addAudioData(data);
    } else {
      console.error(
        "[ main.ipcHandler ] Incoming data for `whisper:add_audio` is not a Float32Array",
      );
    }
  });
  ipcMain.handle(IPC_CHANNELS["WHISPER_GET_TRANSCRIPTION"], (_event, _data) => {
    return sttWhisperStreamingModule.getTranscription();
  });
}
