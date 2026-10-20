export const SOUND_CLIP_MAX_BYTES = 1024 * 1024;
export const SOUND_CLIPS_PER_ORG_LIMIT = 50;
export const SOUND_CLIP_NAME_MAX_LENGTH = 60;
export const SOUND_RULE_NAME_MAX_LENGTH = 60;
export const SOUND_CLIP_WAVEFORM_BARS = 64;

export const SOUND_CLIP_EXTENSIONS: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
};
