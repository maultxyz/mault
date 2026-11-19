import {
  ADMIN_FEATURE_HIGHLIGHT_MEDIA_PATH,
  ADMIN_FEATURE_HIGHLIGHTS_PATH,
  FEATURE_HIGHLIGHT_MEDIA_CONTENT_TYPES,
  FEATURE_HIGHLIGHTS_INCLUDE_SEEN_PARAM,
  FEATURE_HIGHLIGHTS_PATH,
  FEATURE_HIGHLIGHTS_SEEN_PATH,
} from "@magic-vault/shared";
import type { FeatureHighlightSlideFormValues } from "@/schemas/feature-highlights.schema";

export const FEATURE_HIGHLIGHTS_QUERY_KEY = "feature-highlights";
export const ADMIN_FEATURE_HIGHLIGHTS_QUERY_KEY = [
  "admin",
  "feature-highlights",
] as const;

export const FEATURE_HIGHLIGHTS_API = `/api${FEATURE_HIGHLIGHTS_PATH}`;
export const RECENT_FEATURE_HIGHLIGHTS_API = `${FEATURE_HIGHLIGHTS_API}?${FEATURE_HIGHLIGHTS_INCLUDE_SEEN_PARAM}=1`;
export const FEATURE_HIGHLIGHTS_SEEN_API = `/api${FEATURE_HIGHLIGHTS_SEEN_PATH}`;
export const ADMIN_FEATURE_HIGHLIGHTS_API = `/api${ADMIN_FEATURE_HIGHLIGHTS_PATH}`;
export const ADMIN_FEATURE_HIGHLIGHT_MEDIA_API = `/api${ADMIN_FEATURE_HIGHLIGHT_MEDIA_PATH}`;

export const FEATURE_HIGHLIGHTS_DEFERRED_PATH_PATTERN =
  /^\/app(?:\/?$|\/cards\/|\/scan(?:\/|$)|\/sorters?(?:\/|$)|\/calibrate(?:\/|$)|\/monitor\/[^/]+\/camera)/;

export const FEATURE_HIGHLIGHTS_CARD_CLASS =
  "fixed right-4 bottom-8 z-40 flex w-88 max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-6rem)] flex-col overflow-y-auto rounded-xl bg-card p-3 shadow-popover ring-1 ring-border outline-none animate-in fade-in-0 slide-in-from-bottom-2 duration-200 motion-reduce:animate-none";

export const FEATURE_HIGHLIGHT_MEDIA_CLASS =
  "aspect-video w-full rounded-lg bg-muted object-contain";

export const FEATURE_HIGHLIGHT_FORM_ID = "feature-highlight-form";

export const FEATURE_HIGHLIGHT_MEDIA_TYPE_OPTIONS = [
  "none",
  "image",
  "video",
] as const;

export const FEATURE_HIGHLIGHT_MEDIA_ACCEPT = Object.keys(
  FEATURE_HIGHLIGHT_MEDIA_CONTENT_TYPES,
).join(",");

export const FEATURE_HIGHLIGHT_PREVIEW_ID = "admin-preview";

export const EMPTY_FEATURE_HIGHLIGHT_SLIDE: FeatureHighlightSlideFormValues = {
  title: "",
  body: "",
  mediaType: "none",
  mediaUrl: "",
  mediaPosterUrl: "",
  mediaAltText: "",
  linkUrl: "",
  linkLabel: "",
};

export const FEATURE_HIGHLIGHT_INTERACTIVE_KEY_TARGETS = new Set([
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "VIDEO",
]);

export const FEATURE_HIGHLIGHT_SEEN_MAX_IDS = 50;
