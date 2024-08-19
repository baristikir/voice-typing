// TODO: Make this type a shared, to reuse it here and in the backend
type Transcript = {
  id: number;
  title: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};

type TranscribedSegmentPayload = {
  text: string;
  isPartial: boolean;
};

type TranscribedSegments = {
  segments: TranscribedSegmentPayload[];
};

export interface ElectronAPI {
  // Whisper Model
  start: () => Promise<void>;
  stop: () => Promise<void>;
  addAudioData: (data: Float32Array) => Promise<void>;
  getTranscription: () => Promise<TranscribedSegments>;
  // Db
  queryTranscripts: () => Promise<Transcript[]>;
  queryTranscriptById: (id: number) => Promise<Transcript>;
  createTranscript: (title: string, text: string) => Promise<Transcript>;
  updateTranscript: (title?: string, text?: string) => Promise<Transcript>;
  deleteTranscript: (id: number) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
