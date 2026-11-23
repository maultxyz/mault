import type { CardFilters } from "../interfaces/collection-cards.interface";

export const COLLECTION_CARDS_PAGE_SIZE = 50;

export const PAGE_SIZE_OPTIONS: readonly number[] = [25, 50, 75, 100];

export const DEFAULT_CARD_SORT = "scan-desc";

export const EMPTY_CARD_FILTERS: CardFilters = {
  colors: [],
  rarities: [],
  bins: [],
  needsAttention: false,
  hideDownloaded: false,
  sets: [],
  minMatchPercent: 0,
  foilTypes: [],
  conditions: [],
  languages: [],
  finish: "all",
  minPrice: null,
  maxPrice: null,
};
export const COLLECTION_CARDS_SUMMARY_REFRESHING_POLL_MS = 5_000;
export const STORED_STATS_REFRESHING_POLL_MS = 5_000;
export const RECENT_SCANNED_CARDS_COUNT = 5;

export const UNMATCHED_PREVIEW_COUNT = 5;

export const UNMATCHED_PAGE_SIZE = 24;

export const UNMATCHED_PAGE_MAX = 100;

export const UNMATCHED_BULK_SELECTION_MAX = 100;

export const COLLECTION_CARDS_INCLUDE_UNMATCHED_PARAM = "includeUnmatched";

export const UNMATCHED_INLINE_PAGE_MAX = 48;

export const UNMATCHED_RETRY_REQUEST_MAX_SCANS = 8;

export const UNMATCHED_BULK_REMOVE_CONCURRENCY = 4;

export const COLLECTION_PREVIEW_IMAGE_COUNT = 3;

export const COLLECTION_CARDS_RAW_CARD_DATA_PARAM = "rawCardData";

export const COLLECTION_CARDS_RAW_CARD_DATA_ALL = "all";

export const COLLECTION_CARDS_RAW_CARD_DATA_MAIN_ONLY = "mainOnly";

export const COLLECTION_CARDS_RAW_CARD_DATA_NONE = "none";
export const BULK_SCAN_IDS_MAX = 50_000;
