// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";
import { DB_IPC_CHANNELS, WHISPER_IPC_CHANNELS } from "./ipc/IPC";
import { TranscriptContent } from "./shared/models";

console.log("[ preload ] Preload script loaded.");

contextBridge.exposeInMainWorld("electronAPI", {
  start: () => ipcRenderer.invoke(WHISPER_IPC_CHANNELS["WHISPER_START"]),
  stop: () => ipcRenderer.invoke(WHISPER_IPC_CHANNELS["WHISPER_STOP"]),
  addAudioData: (data: any[]) =>
    ipcRenderer.invoke(WHISPER_IPC_CHANNELS["WHISPER_ADD_AUDIO"], data),
  getTranscribedText: () =>
    ipcRenderer.invoke(WHISPER_IPC_CHANNELS["WHISPER_GET_TRANSCRIBED_TEXT"]),
  queryTranscripts: () =>
    ipcRenderer.invoke(DB_IPC_CHANNELS["TRANSCRIPT_GET_ALL"]),
  queryTranscriptById: (id: string) =>
    ipcRenderer.invoke(DB_IPC_CHANNELS["TRANSCRIPT_GET"], id),
  createTranscript: (title: string, text: string) =>
    ipcRenderer.invoke(DB_IPC_CHANNELS["TRANSCRIPT_CREATE"], { title, text }),
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
});
