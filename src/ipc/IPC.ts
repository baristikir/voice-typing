export const DB_IPC_CHANNELS = {
  TRANSCRIPT_GET_ALL: "db:transcript_getAll",
  TRANSCRIPT_GET: "db:transcript_get",
  TRANSCRIPT_CREATE: "db:transcript_create",
  TRANSCRIPT_UPDATE: "db:transcript_update",
  TRANSCRIPT_DELETE: "db:transcript_delete",
  TRANSCRIPT_SAVE_CONTENTS: "db:transcript_save_contents",
} as const;

export const WHISPER_IPC_CHANNELS = {
  WHISPER_START: "whisper:start",
  WHISPER_STOP: "whisper:stop",
  WHISPER_ADD_AUDIO: "whisper:add_audio",
  WHISPER_GET_TRANSCRIBED_TEXT: "whisper:get_transcribed_text",
} as const;
