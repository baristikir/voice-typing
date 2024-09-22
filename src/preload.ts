// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer, OpenDialogOptions } from "electron";
import {
  DB_IPC_CHANNELS,
  DIALOG_IPC_CHANNELS,
  WHISPER_IPC_CHANNELS,
} from "./ipc/IPC";
import { TranscriptContent } from "./shared/models";
import { TranscribedSegments } from "./shared/ipcPayloads";

console.log("[ preload ] Preload script loaded.");

contextBridge.exposeInMainWorld("electronAPI", {
  getUserPreferences: () =>
    ipcRenderer.invoke(DB_IPC_CHANNELS["PREFERENCES_GET"]),
  updateUserPreferences: (data: any) =>
    ipcRenderer.invoke(DB_IPC_CHANNELS["PREFERENCES_UPDATE"], data),
  start: () => ipcRenderer.invoke(WHISPER_IPC_CHANNELS["WHISPER_START"]),
  stop: () => ipcRenderer.invoke(WHISPER_IPC_CHANNELS["WHISPER_STOP"]),
  reconfigure: (data: any) =>
    ipcRenderer.invoke(WHISPER_IPC_CHANNELS["WHISPER_CONFIGURE"], data),
  addAudioData: (data: any[]) =>
    ipcRenderer.invoke(WHISPER_IPC_CHANNELS["WHISPER_ADD_AUDIO"], data),
  clearAudioData: () =>
    ipcRenderer.invoke(WHISPER_IPC_CHANNELS["WHISPER_CLEAR_AUDIO"]),
  getTranscribedText: () =>
    ipcRenderer.invoke(WHISPER_IPC_CHANNELS["WHISPER_GET_TRANSCRIBED_TEXT"]),
  queryTranscripts: () =>
    ipcRenderer.invoke(DB_IPC_CHANNELS["TRANSCRIPT_GET_ALL"]),
  queryTranscriptById: (id: string) =>
    ipcRenderer.invoke(DB_IPC_CHANNELS["TRANSCRIPT_GET"], id),
  createTranscript: (title: string, payload: TranscribedSegments) =>
    ipcRenderer.invoke(DB_IPC_CHANNELS["TRANSCRIPT_CREATE"], {
      title,
      payload,
    }),
  updateTranscript: (
    data: {
      id: number;
      title?: string;
      contents?: (TranscriptContent & { isNew: boolean })[];
    },
  ) =>
    ipcRenderer.invoke(DB_IPC_CHANNELS["TRANSCRIPT_UPDATE"], {
      ...data,
    }),
  deleteTranscript: (id: number) =>
    ipcRenderer.invoke(DB_IPC_CHANNELS["TRANSCRIPT_DELETE"], id),
  saveTranscriptContents: (data: {
    id: number;
    contents: TranscriptContent[];
  }) => ipcRenderer.invoke(DB_IPC_CHANNELS["TRANSCRIPT_SAVE_CONTENTS"], data),
  transcribeFileInput: (data: string) =>
    ipcRenderer.invoke(
      WHISPER_IPC_CHANNELS["WHISPER_TRANSCRIBE_FILE_INPUT"],
      data,
    ),
  openDialog: (options: OpenDialogOptions) =>
    ipcRenderer.invoke(DIALOG_IPC_CHANNELS["DIALOG_OPEN"], options),
});
