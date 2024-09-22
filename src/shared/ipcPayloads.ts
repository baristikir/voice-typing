export type TranscribedSegmentPayload = {
  text: string;
  isPartial: boolean;
};

export type TranscribedSegments = {
  segments: TranscribedSegmentPayload[];
};
