import { useEffect } from "react";

type DeviceKind = "audioinput" | "videoinput";
async function getConnectedDevices(type: DeviceKind) {
	const devices = await navigator.mediaDevices.enumerateDevices();
	return devices.filter((device) => device.kind === type);
}

async function mediaDevicesChangeListener(
	_: Event,
	cb: (deviceList: MediaDeviceInfo[]) => void
) {
	const newAudioDevicesList = await getConnectedDevices("audioinput");
	cb(newAudioDevicesList);
}

export function useRegisterMediaDevicesListener(
	cb: (deviceList: MediaDeviceInfo[]) => void
) {
	useEffect(() => {
		navigator.mediaDevices.addEventListener("devicechange", (event) =>
			mediaDevicesChangeListener(event, cb)
		);

		return () => {
			navigator.mediaDevices.removeEventListener("devicechange", (event) =>
				mediaDevicesChangeListener(event, cb)
			);
		};
	}, []);
}

const constraints = { audio: true, video: false };
const audioContext = new AudioContext({ sampleRate: 16_000 });

export function useAudioRecording() {
	useEffect(() => {
		navigator.mediaDevices
			.getUserMedia(constraints)
			.then(async (mediaStream) => {
				await audioContext.audioWorklet.addModule(
					"worklet/whisperWorkletProcessor.js"
				);

				const source = new MediaStreamAudioSourceNode(audioContext, {
					mediaStream,
				});

				const worklet = new AudioWorkletNode(
					audioContext,
					"whisper-worklet-processor",
					{
						processorOptions: {
							channelCount: 1,
							reportSize: 3072,
						},
					}
				);

				worklet.onprocessorerror = console.trace;
				worklet.port.onmessage = async (event) => {
					const {} = event.data;
					console.log(
						"[ audio_worklet ] worklet.port.onmessage.event.data: ",
						event.data
					);
				};
				source.connect(worklet);
				worklet.connect(audioContext.destination);
			});
	}, []);
}
