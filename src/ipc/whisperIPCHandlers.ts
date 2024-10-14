import { assert } from "../components/utils/assert";
import { ipcMain } from "electron";
import { WHISPER_IPC_CHANNELS } from "./IPC";
import { getWhisperModelPath } from "@/utils/whisperModel";
import { UserPreferencesDbService } from "@/backend/db";
import { TranscribedSegments } from "@/shared/ipcPayloads";

// Depends on addon.cc definition from STTAddon::Init
type STTEngineModule = {
  start: () => void;
  stop: () => void;
  reconfigure: (data: {
    language_id: number;
    model_path: string;
    trigger_ms: number;
    n_threads: number;
  }) => number;
  addAudioData: (data: Float32Array) => void;
  clearAudioData: () => void;
  getTranscribedText: () => string;
  transcribeFileInput: (filePath: string) => TranscribedSegments;
};
// Defines the IPC-Handlers for all STT-Engine interactions, including reconfiguration of the Whisper model parameters.
export function registerWhisperIPCHandler(
  sttEngineModule: STTEngineModule,
): void {
  ipcMain.handle(WHISPER_IPC_CHANNELS["WHISPER_CONFIGURE"], (_event, data) => {
    console.log("[ whisperIPC ] New model configuration received");

    assert.strictEqual(typeof data === "object", true);
    if ("mLanguageId" in data) {
      assert.strictEqual(typeof data.mLanguageId === "number", true);
    }
    if ("mType" in data) {
      assert.strictEqual(typeof data.mType === "string", true);
    }
    if ("mThreads" in data) {
      assert.strictEqual(typeof data.mThreads === "number", true);
    }
    if ("mTriggerMs" in data) {
      assert.strictEqual(typeof data.mTriggerMs === "number", true);
    }

    console.log(data);
    // Whisper model path for the selected model type
    const whisperModelPath = getWhisperModelPath(data.mType);

    // Update database to match users settings
    const updatedPreferences = UserPreferencesDbService.updateUserPreferences({
      speechRecognitionLanguageId: data.mLanguageId,
      speechRecognitionModelType: data.mType,
      speechRecognitionThreads: data.mThreads,
      speechRecognitionTriggerMs: data.mTriggerMs,
    });

    // Check STTAddon::Reconfigure for more details
    sttEngineModule.reconfigure({
      language_id: data.mLanguageId,
      model_path: whisperModelPath,
      trigger_ms: data.mTriggerMs
        ? data.mTriggerMs
        : updatedPreferences.speechRecognitionTriggerMs,
      n_threads: data.mThreads
        ? data.mThreads
        : updatedPreferences.speechRecognitionThreads,
    });
    return updatedPreferences;
  });
  ipcMain.handle(WHISPER_IPC_CHANNELS["WHISPER_START"], (_event, _data) => {
    console.log("[ whisperIPC ] Starting whisper ipc handler called.");
    sttEngineModule.start();
  });
  ipcMain.handle(WHISPER_IPC_CHANNELS["WHISPER_STOP"], (_event, _data) => {
    console.log("[ whisperIPC ] Stopping whisper ipc handler called.");
    sttEngineModule.stop();
  });
  ipcMain.handle(WHISPER_IPC_CHANNELS["WHISPER_ADD_AUDIO"], (_event, data) => {
    assert.strictEqual(data instanceof Float32Array, true);

    if (data instanceof Float32Array) {
      sttEngineModule.addAudioData(data);
    } else {
      console.error(
        "[ main.ipcHandler ] Incoming data for `whisper:add_audio` is not a Float32Array",
      );
    }
  });
  ipcMain.handle(
    WHISPER_IPC_CHANNELS["WHISPER_GET_TRANSCRIBED_TEXT"],
    (_event, _data) => {
      return sttEngineModule.getTranscribedText();
    },
  );
  ipcMain.handle(
    WHISPER_IPC_CHANNELS["WHISPER_CLEAR_AUDIO"],
    (_event, _data) => {
      sttEngineModule.clearAudioData();
    },
  );
  ipcMain.handle(
    WHISPER_IPC_CHANNELS["WHISPER_TRANSCRIBE_FILE_INPUT"],
    (_event, data) => {
      const segments = sttEngineModule.transcribeFileInput(data);
      return segments;
    },
  );
}
