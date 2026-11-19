import type { FeatureHighlight } from "../interfaces/feature-highlight.interface";

export const FEATURE_HIGHLIGHTS_PATH = "/feature-highlights";
export const FEATURE_HIGHLIGHTS_SEEN_PATH = "/feature-highlights/seen";
export const FEATURE_HIGHLIGHTS_INCLUDE_SEEN_PARAM = "includeSeen";
export const ADMIN_FEATURE_HIGHLIGHTS_PATH = "/admin/feature-highlights";
export const ADMIN_FEATURE_HIGHLIGHT_MEDIA_PATH = "/admin/feature-highlights/media";

export const FEATURE_HIGHLIGHT_MAX_AGE_DAYS = 45;
export const FEATURE_HIGHLIGHT_MAX_SHOWN = 5;
export const FEATURE_HIGHLIGHT_MAX_SLIDES = 8;
export const FEATURE_HIGHLIGHT_TITLE_MAX_LENGTH = 80;
export const FEATURE_HIGHLIGHT_BODY_MAX_LENGTH = 400;
export const FEATURE_HIGHLIGHT_ALT_TEXT_MAX_LENGTH = 200;
export const FEATURE_HIGHLIGHT_LINK_LABEL_MAX_LENGTH = 40;
export const FEATURE_HIGHLIGHT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const FEATURE_HIGHLIGHT_VIDEO_MAX_BYTES = 30 * 1024 * 1024;
export const FEATURE_HIGHLIGHT_MEDIA_CONTENT_TYPES = {
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
  "image/gif": "image",
  "video/mp4": "video",
  "video/webm": "video",
} as const;

export const FEATURE_HIGHLIGHT_RELEASE_MEDIA_PATH = "/feature-highlights";

export const RELEASE_FEATURE_HIGHLIGHTS: FeatureHighlight[] = [];
