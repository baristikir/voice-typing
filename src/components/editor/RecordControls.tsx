import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { RecorderProcessorMessageData } from "./RecordingTranscriptions";
import { Button } from "../ui/Button";
import { assert } from "../utils/assert";
import { EditorMode } from "./useEditor";

interface Props {
	onEditorModeChange(payload: EditorMode): void;
}
export const RecordControls = (props: Props) => {
	const [isRecording, setIsRecording] = useState(false);
	const audioRecordRef = useRef<{ stopRecording: () => void }>(null);

	const recordAudio = async () => {
		props.onEditorModeChange(EditorMode.DICTATING);
		let stream = await navigator.mediaDevices.getUserMedia({ audio: true });

		try {
			const audioContext = new AudioContext({
				sampleRate: 16000,
				//@ts-ignore
				channelCount: 1,
				echoCancellation: false,
				autoGainControl: true,
				noiseSuppression: true,
			});

			// window.electronAPI.start();
			await audioContext.audioWorklet.addModule(
				"worklet/whisperWorkletProcessor.js",
			);

			const source = new MediaStreamAudioSourceNode(audioContext, {
				mediaStream: stream,
			});

			const worklet = new AudioWorkletNode(audioContext, "recorder-processor", {
				processorOptions: {
					channelCount: 1,
					reportSize: 3072,
				},
			});

			worklet.onprocessorerror = console.trace;
			worklet.port.onmessage = async (event) => {
				assert.strictEqual(typeof event.data, "object");
				assert("recordBuffer" in event.data);
				assert("sampleRate" in event.data);
				assert("currentFrame" in event.data);

				const { recordBuffer, sampleRate, currentFrame } =
					event.data as RecorderProcessorMessageData;

				if (recordBuffer[0].length === 0) return;
				window.electronAPI.addAudioData(recordBuffer[0]);
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

			audioRecordRef.current = {
				stopRecording,
			};
			setIsRecording(true);
		} catch (error) {
			console.error("[ recordAudio ] error: ", error);
		}
	};

	const pauseAudio = () => {
		console.log("[ pauseAudio ] Disconnecting audio worklet.");
		if (audioRecordRef.current) {
			console.log("[ pauseAudio ] Ref found.");
			void audioRecordRef.current.stopRecording();
			audioRecordRef.current = null;
		}

		setIsRecording(false);
	};

	return (
		<div className="flex gap-1 items-center">
			<Link to={"/"}>
				<Button size="sm" variant="outline">
					Übersicht
				</Button>
			</Link>
			{isRecording === false ? (
				<Button size="sm" variant="outline" onClick={recordAudio}>
					Record Audio
				</Button>
			) : (
				<Button onClick={pauseAudio}>Pause Audio</Button>
			)}
		</div>
	);
};
