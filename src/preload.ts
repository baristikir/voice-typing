// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "./ipc/whisperIPC";

console.log("[ preload ] Preload script loaded.");

contextBridge.exposeInMainWorld("electronAPI", {
	start: () => ipcRenderer.invoke(IPC_CHANNELS["WHISPER_START"]),
	stop: () => ipcRenderer.invoke(IPC_CHANNELS["WHISPER_STOP"]),
	addAudioData: (data: any[]) =>
		ipcRenderer.invoke(IPC_CHANNELS["WHISPER_ADD_AUDIO"], data),
	getTranscription: () =>
		ipcRenderer.invoke(IPC_CHANNELS["WHISPER_GET_TRANSCRIPTION"]),
});
