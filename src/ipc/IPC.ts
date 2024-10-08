export const DB_IPC_CHANNELS = {
  PREFERENCES_GET: "db:preferences_get",
  PREFERENCES_UPDATE: "db:preferences_update",
  TRANSCRIPT_GET_ALL: "db:transcript_getAll",
  TRANSCRIPT_GET: "db:transcript_get",
  TRANSCRIPT_CREATE: "db:transcript_create",
  TRANSCRIPT_UPDATE: "db:transcript_update",
  TRANSCRIPT_DELETE: "db:transcript_delete",
  TRANSCRIPT_SAVE_CONTENTS: "db:transcript_save_contents",
} as const;

export const WHISPER_IPC_CHANNELS = {
  WHISPER_CONFIGURE: "whisper:configure",
  WHISPER_START: "whisper:start",
  WHISPER_STOP: "whisper:stop",
  WHISPER_ADD_AUDIO: "whisper:add_audio",
  WHISPER_CLEAR_AUDIO: "whisper:clear_audio",
  WHISPER_GET_TRANSCRIBED_TEXT: "whisper:get_transcribed_text",
  WHISPER_TRANSCRIBE_FILE_INPUT: "whisper:trnascribe_file_input",
} as const;

export const DIALOG_IPC_CHANNELS = {
  DIALOG_OPEN: "dialog:open",
} as const;
