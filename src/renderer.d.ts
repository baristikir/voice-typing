import { Transcript, TranscriptContent } from "./shared/models";

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
  createTranscript: (
    title: string,
    content?: Omit<TranscriptContent, "id">,
  ) => Promise<Transcript>;
  updateTranscript: (
    data: {
      id: number;
      title?: string;
      contents?: (TranscriptContent | Omit<TranscriptContent, "order">)[];
    },
  ) => Promise<Transcript>;
  deleteTranscript: (id: number) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
