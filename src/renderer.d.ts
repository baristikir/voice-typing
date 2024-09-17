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
  getTranscribedText: () => Promise<TranscribedSegments>;
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
      contents?: ((TranscriptContent | Omit<TranscriptContent, "order">) & {
        actionKind: "insert" | "update" | "delete";
      })[];
    },
  ) => Promise<Transcript>;
  deleteTranscript: (id: number) => void;
  saveTranscriptContents: (
    data: {
      id: number;
      contents: TranscriptContent[];
    },
  ) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
