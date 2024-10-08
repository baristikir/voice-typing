import { MutableRefObject, useState } from "react";
import { RecorderProcessorMessageData } from "./RecordingTranscriptions";
import { Button } from "../ui/Button";
import { assert } from "../utils/assert";
import { EditorMode } from "./useEditor";
import { api } from "@/utils/rendererElectronAPI";
import { Microphone, Pause } from "@phosphor-icons/react";
import { useAtomValue } from "jotai";
import { selectedAudioDeviceAtom } from "@/state/audioAtoms";

interface Props {
	audioRecordRef: MutableRefObject<{ stopRecording: () => void }>;
	onEditorModeChange(payload: EditorMode): void;
}
export const AudioRecordingControl = (props: Props) => {
	const deviceId = useAtomValue(selectedAudioDeviceAtom);
	const [isRecording, setIsRecording] = useState(false);

	const recordAudio = async () => {
		props.onEditorModeChange(EditorMode.DICTATING);
		const stream = deviceId
			? await navigator.mediaDevices.getUserMedia({
					audio: {
						deviceId: {
							exact: deviceId,
						},
					},
				})
			: await navigator.mediaDevices.getUserMedia({ audio: true });

		try {
			const audioContext = new AudioContext({ sampleRate: 16000 });
			await audioContext.audioWorklet.addModule("worklet/whisperWorkletProcessor.js");

			const source = new MediaStreamAudioSourceNode(audioContext, {
				mediaStream: stream,
			});

			const worklet = new AudioWorkletNode(audioContext, "recorder-processor", {
				processorOptions: {
					reportSize: 3200,
				},
			});

			worklet.onprocessorerror = console.trace;
			worklet.port.onmessage = async (event) => {
				assert.strictEqual(typeof event.data, "object");
				assert("recordBuffer" in event.data);
				assert("sampleRate" in event.data);
				assert("currentFrame" in event.data);

				const { recordBuffer } = event.data as RecorderProcessorMessageData;

				if (recordBuffer[0].length === 0) return;
				api.addAudioData(recordBuffer[0]);
			};
			source.connect(worklet);
			worklet.connect(audioContext.destination);

			const stopRecording = () => {
				props.onEditorModeChange(EditorMode.EDITING);
				source.disconnect();
				worklet.disconnect();

				stream.getTracks().forEach((track) => track.stop());

				audioContext.close();
			};

			props.audioRecordRef.current = {
				stopRecording,
			};
			setIsRecording(true);
		} catch (error) {
			console.error("[ recordAudio ] error: ", error);
		}
	};

	const pauseAudio = () => {
		console.log("[ pauseAudio ] Disconnecting audio worklet.");
		if (props.audioRecordRef.current) {
			void props.audioRecordRef.current.stopRecording();
			props.audioRecordRef.current = null;
		}

		setIsRecording(false);
		api.clearAudioData();
	};

	return isRecording === false ? (
		<Button size="sm" variant="outline" onClick={recordAudio}>
			<Microphone weight="regular" className="h-4 w-4 mr-1" />
			Aufnahme Starten
		</Button>
	) : (
		<Button size="sm" onClick={pauseAudio}>
			<Pause className="h-4 w-4 mr-1" />
			Aufnahme pausieren
		</Button>
	);
};
