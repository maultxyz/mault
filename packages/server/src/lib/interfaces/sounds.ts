export type SoundClipUploadParseResult =
  | { success: true; file: File; contentType: string; name: string }
  | { success: false; message: string };
