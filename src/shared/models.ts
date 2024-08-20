export interface Transcript {
  id: number;
  title: string;
  contents: TranscriptContent[];
  createdAt: Date;
  updatedAt: Date;
}

export enum TranscriptContentType {
  Paragraph = "p",
  Headline1 = "h1",
  Linebreak = "br",
}
export interface TranscriptContent {
  id: number;
  type: TranscriptContentType;
  content: string;
  order: number;
}
