import {
  FEATURE_HIGHLIGHT_IMAGE_MAX_BYTES,
  FEATURE_HIGHLIGHT_VIDEO_MAX_BYTES,
  type FeatureHighlightMediaType,
} from "@magic-vault/shared";

export const FEATURE_HIGHLIGHTS_CACHE_MAX_AGE_MS = 60 * 1000;
export const FEATURE_HIGHLIGHT_SEEN_MAX_IDS = 50;
export const FEATURE_HIGHLIGHT_ID_MAX_LENGTH = 100;
export const FEATURE_HIGHLIGHT_URL_MAX_LENGTH = 2048;
export const FEATURE_HIGHLIGHT_MEDIA_STORAGE_PREFIX = "system/feature-highlights/";
export const FEATURE_HIGHLIGHT_STORED_MEDIA_URL_PREFIX = "storage:";
export const FEATURE_HIGHLIGHT_STORED_MEDIA_KEY_PATTERN =
  /^system\/feature-highlights\/[0-9a-f-]{36}\.(png|jpg|webp|gif|mp4|webm)$/;
export const FEATURE_HIGHLIGHT_DATA_URL_PATTERN =
  /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/;
export const FEATURE_HIGHLIGHT_MEDIA_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};
export const FEATURE_HIGHLIGHT_MEDIA_MAX_BYTES_BY_TYPE: Record<
  FeatureHighlightMediaType,
  number
> = {
  image: FEATURE_HIGHLIGHT_IMAGE_MAX_BYTES,
  video: FEATURE_HIGHLIGHT_VIDEO_MAX_BYTES,
};
export const FEATURE_HIGHLIGHT_MEDIA_UPLOAD_BODY_MAX_BYTES =
  FEATURE_HIGHLIGHT_VIDEO_MAX_BYTES + 1024 * 1024;
export const FEATURE_HIGHLIGHT_GUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const FEATURE_HIGHLIGHT_INCLUDE_SEEN_VALUES = ["1", "true"];
