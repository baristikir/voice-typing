export const DB_IPC_CHANNELS = {
  TRANSCRIPT_GET_ALL: "db:transcript_getAll",
  TRANSCRIPT_GET: "db:transcript_get",
  TRANSCRIPT_CREATE: "db:transcript_create",
  TRANSCRIPT_UPDATE: "db:transcript_update",
  TRANSCRIPT_DELETE: "db:transcript_delete",
} as const;

export const WHISPER_IPC_CHANNELS = {
  WHISPER_START: "whisper:start",
  WHISPER_STOP: "whisper:stop",
  WHISPER_ADD_AUDIO: "whisper:add_audio",
  WHISPER_GET_TRANSCRIPTION: "whisper:get_transcription",
} as const;
