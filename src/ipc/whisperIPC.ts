import { ipcMain } from "electron";

type STTWhisperStreamingModule = {
	addAudio: (data: Float32Array) => void;
	getTranscription: () => string;
};
export function registerWhisperIPCHandler(
	sttWhisperStreamingModule: STTWhisperStreamingModule
): void {
	ipcMain.handle("whisper:add_audio", (_event, data) => {
		// assert.strictEqual(data instanceof Float32Array, "true");

		if (data instanceof Float32Array) {
			sttWhisperStreamingModule.addAudio(data);
		} else {
			console.error(
				"[ main.ipcHandler ] Incoming data for `whisper:add_audio` is not a Float32Array"
			);
		}
	});
	ipcMain.handle("whisper:get_transcription", (_event, _data) => {
		return sttWhisperStreamingModule.getTranscription();
	});
}
