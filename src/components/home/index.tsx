import { useRef, useState } from "react";
import { Button } from "../ui/Button";

function assert(condition: any, msg?: string) {
	if (!condition) {
		throw new Error(msg || "Assertion failed");
	}
}
assert.strictEqual = function (a: any, b: any, msg?: string) {
	if (a !== b) {
		throw new Error(msg || `Assertion failed: ${a} !== ${b}`);
	}
};

type RecorderProcessorMessageData = {
	recordBuffer: Float32Array[];
	sampleRate: number;
	currentFrame: number;
};
interface Props {}

const audioContext = new AudioContext({
	sampleRate: 16_000,
});

export function HomeContent(props: Props) {
	const [isRecording, setIsRecording] = useState(false);
	const audioRecordRef = useRef<{ disconnect: () => void }>(null);

	const recordAudio = async () => {
		let stream = navigator.mediaDevices
			.getUserMedia({ audio: true })
			.then(async (mediaStream) => {
				try {
					await audioContext.audioWorklet.addModule(
						"worklet/whisperWorkletProcessor.js"
					);

					const source = new MediaStreamAudioSourceNode(audioContext, {
						mediaStream,
					});

					const worklet = new AudioWorkletNode(
						audioContext,
						"recorder-processor",
						{
							processorOptions: {
								channelCount: 1,
								reportSize: 3072,
							},
						}
					);

					worklet.onprocessorerror = console.trace;
					worklet.port.onmessage = async (event) => {
						assert.strictEqual(typeof event.data, "object");
						assert("recordBuffer" in event.data);
						assert("sampleRate" in event.data);
						assert("currentFrame" in event.data);

						const { recordBuffer, sampleRate, currentFrame } =
							event.data as RecorderProcessorMessageData;

						if (recordBuffer[0].length === 0) return;
						// window.electronAPI.invoke('add-audio-data', recordBuffer[0])

						console.log(
							"[ audio_worklet ] worklet.port.onmessage.event.data: ",
							event.data
						);
					};
					source.connect(worklet);
					worklet.connect(audioContext.destination);

					return {
						disconnect: () => {
							source.disconnect();
							worklet.disconnect();
						},
					};
				} catch (error) {
					console.error("[ recordAudio ] error: ", error);
				}
			});

		audioRecordRef.current = await stream;
		setIsRecording(true);
	};

	const pauseAudio = () => {
		console.log("[ pauseAudio ] Disconnecting audio worklet.");
		if (audioRecordRef.current) {
			console.log("[ pauseAudio ] Ref found.");
			void audioRecordRef.current.disconnect();
			audioRecordRef.current = null;
		}

		setIsRecording(false);
	};

	return (
		<div>
			<h1 className="text-3xl font-semibold">Home</h1>
			<Button onClick={recordAudio}>Record Audio</Button>
			{isRecording && <Button onClick={pauseAudio}>Pause Audio</Button>}
		</div>
	);
}
