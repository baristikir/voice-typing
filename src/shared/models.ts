export type SpeechRecognitionModelType =
  | "tiny"
  | "base"
  | "small"
  | "medium"
  | "turbo";
export interface UserPreferences {
  speechRecognitionModelType: SpeechRecognitionModelType;
  speechRecognitionLanguageId: number;
  pushToTalkEnabled: boolean;
  deviceId?: string;
}

export interface Transcript {
  id: number;
  title: string;
  contents: TranscriptContent[];
  createdAt: Date;
  updatedAt: Date;
}

export enum TranscriptContentType {
  Text = "text",
  Headline1 = "headline",
  Linebreak = "linebreak",
}
export interface TranscriptContent {
  id: string;
  type: TranscriptContentType;
  content: string;
  order: number;
}
