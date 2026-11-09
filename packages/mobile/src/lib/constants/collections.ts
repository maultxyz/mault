import type { CardViewMode, CollectionScanTimeline } from "@/lib/interfaces/collections";
export const CARD_THUMB_WIDTH = 44;
export const CARD_THUMB_HEIGHT = Math.round((CARD_THUMB_WIDTH * 3.5) / 2.5);
export const SEARCH_DEBOUNCE_MS = 300;
export const LIST_END_THRESHOLD = 0.5;
export const CARD_GRID_COLUMNS = 3;
export const CARD_ASPECT_RATIO = 2.5 / 3.5;
export const CARD_GRID_GAP_X = 12;
export const CARD_GRID_GAP_Y = 20;
export const CARD_GRID_GUTTER = 16;

export const CARD_VIEW_MODES: readonly CardViewMode[] = ["list", "grid"];
export const COLLECTION_SCAN_TIMELINE_KEY = "mault:collection-scan-timeline";
export const COLLECTION_SCAN_TIMELINE_OPTIONS: readonly CollectionScanTimeline[] = ["off", "day", "hour"];
export const STORAGE_CARD_VIEW_MODE_KEY = "mault:storage-card-view-mode";
export const COLLECTION_SEARCH_MIN_COUNT = 5;
export const UNMATCHED_LIST_PAGE_SIZE = 30;
