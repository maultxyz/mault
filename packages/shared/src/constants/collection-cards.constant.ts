import type { CardFilters } from "../interfaces/collection-cards.interface";

export const COLLECTION_CARDS_PAGE_SIZE = 50;

export const DEFAULT_CARD_SORT = "scan-desc";

export const EMPTY_CARD_FILTERS: CardFilters = {
  colors: [],
  rarities: [],
  bins: [],
  needsAttention: false,
  showDownloaded: false,
  sets: [],
  minMatchPercent: 0,
  foilTypes: [],
};
export const RECENT_SCANNED_CARDS_COUNT = 5;

export const UNMATCHED_PREVIEW_COUNT = 5;

export const UNMATCHED_PAGE_SIZE = 24;

export const UNMATCHED_PAGE_MAX = 100;

export const COLLECTION_PREVIEW_IMAGE_COUNT = 3;
export const BULK_SCAN_IDS_MAX = 50_000;
