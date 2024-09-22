import { OpenDialogOptions } from "electron";
import {
  Transcript,
  TranscriptContent,
  UserPreferences,
} from "./shared/models";

type TranscribedSegmentPayload = {
  text: string;
  isPartial: boolean;
};

type TranscribedSegments = {
  segments: TranscribedSegmentPayload[];
};

export interface ElectronAPI {
  // User Preferences
  getUserPreferences: () => Promise<UserPreferences>;
  updateUserPreferences: (
    preferences: UserPreferences,
  ) => Promise<UserPreferences>;
  // Whisper Model
  start: () => Promise<void>;
  stop: () => Promise<void>;
  reconfigure: (
    data: { mLanguageId: number },
  ) => Promise<number>;
  addAudioData: (data: Float32Array) => Promise<void>;
  clearAudioData: () => Promise<void>;
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
  transcribeFileInput: (filePath: string) => Promise<TranscribedSegments>;
  openDialog: (options: OpenDialogOptions) => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
