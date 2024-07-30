import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { assert } from "../utils/assert";
import { TitleWithInput } from "./TitleWithInput";

interface Props {}
export function NewDictationContent(props: Props) {
	return (
		<div className="flex flex-col gap-6 w-full h-full">
			<div className="flex items-center justify-between w-full">
				<TitleWithInput />
				<RecordControls />
			</div>
			<div>
				<RecordingTranscriptions />
			</div>
		</div>
	);
}

// ------------------------------
// Audio Recording
type RecorderProcessorMessageData = {
	recordBuffer: Float32Array[];
	sampleRate: number;
	currentFrame: number;
};

const RecordControls = () => {
	const [isRecording, setIsRecording] = useState(false);
	const audioRecordRef = useRef<{ stopRecording: () => void }>(null);

	const recordAudio = async () => {
		let stream = navigator.mediaDevices
			.getUserMedia({ audio: true })
			.then(async (mediaStream) => {
				try {
					const audioContext = new AudioContext({
						sampleRate: 16_000,
						//@ts-ignore
						channelCount: 1,
						echoCancellation: false,
						autoGainControl: true,
						noiseSuppression: true,
					});

					// window.electronAPI.start();
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
						//@ts-ignore
						window.electronAPI.addAudioData(recordBuffer[0]);
					};
					source.connect(worklet);
					worklet.connect(audioContext.destination);

					const stopRecording = () => {
						source.disconnect();
						worklet.disconnect();

						mediaStream.getTracks().forEach((track) => track.stop());

						audioContext.close();
					};

					return { stopRecording };
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
			void audioRecordRef.current.stopRecording();
			audioRecordRef.current = null;
		}

		setIsRecording(false);
	};

	return (
		<div className="flex gap-1 items-center">
			<Link to={"/"}>
				<Button variant="destructive">Beenden</Button>
			</Link>
			{isRecording === false ? (
				<Button onClick={recordAudio}>Record Audio</Button>
			) : (
				<Button onClick={pauseAudio}>Pause Audio</Button>
			)}
		</div>
	);
};

const RecordingTranscriptions = () => {
	const textContainerRef = useRef<HTMLDivElement>(null);

	console.log("Transcribing audio...");
	useEffect(() => {
		let timer = setInterval(async () => {
			let newTranscriptions = await window.electronAPI.getTranscription();
			if (!newTranscriptions) return;
			if (!textContainerRef.current) return;

			// console.log("newTranscriptions: ", newTranscriptions);
			for (let i = 0; i < newTranscriptions.segments.length; i++) {
				const segment = newTranscriptions.segments[i];
				const lastText = textContainerRef.current?.lastChild as HTMLSpanElement;

				console.log("[ RecordingTranscriptions ] message: ", segment);

				if (!lastText || lastText.dataset.partial === "false") {
					const span = document.createElement("span");
					span.textContent = segment.text;
					span.className =
						"text-xl text-gray-950 data-[partial=true]:text-gray-400 data-[partial=true]:font-light";

					if (segment.isPartial === true) {
						span.dataset.partial = "true";
					} else {
						span.dataset.partial = "false";
					}

					textContainerRef.current.appendChild(span);
				} else {
					lastText.textContent = segment.text;
					if (!segment.isPartial) {
						lastText.dataset.partial = "false";
					}
				}
			}
		}, 300);

		return () => {
			clearInterval(timer);
		};
	}, []);

	return <div ref={textContainerRef}></div>;
};
