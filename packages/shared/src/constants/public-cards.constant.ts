import type { PublicCardFilters } from "../interfaces/public-cards.interface";

export const PUBLIC_CARDS_SEARCH_MAX_LENGTH = 100;
export const PUBLIC_CARDS_PAGE_SIZE = 48;
export const PUBLIC_CARDS_PAGE_SIZE_MAX = 96;
export const PUBLIC_CARD_SORTS = ["newest", "name", "price-desc", "price-asc"] as const;
export const PUBLIC_CARD_PRICE_SORTS = ["price-desc", "price-asc"] as const;
export const DEFAULT_PUBLIC_CARD_SORT = "newest";
export const PUBLIC_CARD_FINISHES = ["all", "foil", "nonfoil"] as const;
export const PUBLIC_CARD_FILTER_VALUES_MAX = 200;
export const PUBLIC_CARD_FILTER_VALUE_MAX_LENGTH = 120;
export const EMPTY_PUBLIC_CARD_FILTERS: PublicCardFilters = {
  sets: [],
  rarities: [],
  colors: [],
  foilTypes: [],
  conditions: [],
  languages: [],
  finish: "all",
  minPrice: null,
  maxPrice: null,
};
