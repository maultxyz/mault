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
