import type { CardFilters } from "@/lib/interfaces/cards";

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
