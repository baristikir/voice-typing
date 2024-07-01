const WHISPER_SUPPORTED_CHANNEL_COUNT = 1;

export async function registerAudioWorkletProcessor(
	context: AudioContext,
	mediaStream: MediaStream
) {
	await context.audioWorklet.addModule("worklet/whisperWorkletProcessor.js");
	const source = new MediaStreamAudioSourceNode(context, {
		mediaStream,
	});
	const worklet = new AudioWorkletNode(context, "whisper-worklet-processor", {
		processorOptions: {
			channelCount: WHISPER_SUPPORTED_CHANNEL_COUNT,
			reportSize: 3072,
		},
	});

	worklet.onprocessorerror = console.trace;
	worklet.port.onmessage = async (event) => {
		const {} = event.data;
		console.log(
			"[ audio_worklet ] worklet.port.onmessage.event.data: ",
			event.data
		);
	};

	source.connect(worklet).connect(context.destination);
}
