type TranscribedSegmentPayload = {
	text: string;
	isPartial: boolean;
};

type TranscribedSegments = {
	segments: TranscribedSegmentPayload[];
};

export interface ElectronAPI {
	start: () => Promise<void>;
	stop: () => Promise<void>;
	addAudioData: (data: any[]) => Promise<void>;
	getTranscription: () => Promise<TranscribedSegments>;
}

declare global {
	interface Window {
		electronAPI: ElectronAPI;
	}
}
