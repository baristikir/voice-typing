export const api = window.electronAPI;

export type QueryTranscriptByIdData = Awaited<
  ReturnType<typeof api.queryTranscriptById>
>;
export type QueryTranscriptsData = Awaited<
  ReturnType<typeof api.queryTranscripts>
>;
export type UpdateTranscriptsData = Awaited<
  ReturnType<typeof api.updateTranscript>
>;
export type CreateTranscriptsData = Awaited<
  ReturnType<typeof api.createTranscript>
>;
