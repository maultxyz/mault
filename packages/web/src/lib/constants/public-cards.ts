export const ALL_PUBLIC_CARD_GAMES = "all";
export const PUBLIC_CARD_FILTER_LEGEND_CLASS = "mb-1.5 text-xs font-semibold text-foreground/70";
export const PUBLIC_CARD_FILTER_LABEL_CLASS = "flex min-w-0 flex-1 items-center gap-2 text-control";
export const PUBLIC_CARD_FILTER_COUNT_CLASS = "ml-auto shrink-0 text-xs text-foreground/70 tabular-nums";
export const PUBLIC_CARD_FILTER_SEARCHABLE_MIN_OPTIONS = 8;
export const PUBLIC_CARD_PARAM = "card";
export const PUBLIC_CARDS_LOADING_TILE_COUNT = 18;
export const PUBLIC_CARDS_LOADING_FILTER_GROUP_COUNT = 4;
export const PUBLIC_CARDS_LOADING_FILTER_OPTION_COUNT = 3;
export const PUBLIC_CARDS_SOURCE_PATHS = {
  catalog: "shop-catalog",
  watch: "monitor-link/browse",
  storage: "storage-share-link/browse",
  card: "card-share-link/browse",
} as const;
export const PUBLIC_CARDS_QUERY_KEY = "public-cards";
export const PUBLIC_TRADE_OFFER_PARAM = "trade";
export const PUBLIC_TRADE_OFFER_PARAM_VALUE = "1";
export const PUBLIC_CARD_SEARCH_QUERY_PARAM = "q";
export const PUBLIC_CARD_SORT_PARAM = "sort";
export const PUBLIC_CARD_GAME_PARAM = "game";
export const PUBLIC_CARD_PAGE_PARAM = "page";
export const PUBLIC_CARD_FILTER_LIST_SEARCH_PARAMS = {
  sets: "sets",
  rarities: "rarities",
  colors: "colors",
  foilTypes: "foils",
  conditions: "conditions",
  languages: "languages",
} as const;
export const PUBLIC_CARD_FINISH_PARAM = "finish";
export const PUBLIC_CARD_MIN_PRICE_PARAM = "minPrice";
export const PUBLIC_CARD_MAX_PRICE_PARAM = "maxPrice";
export const PUBLIC_CARD_PARAM_NAMES_CLEARED_ON_TEXT_CHANGE: readonly string[] =
  [PUBLIC_CARD_PAGE_PARAM];
export const PUBLIC_CARD_VIEW_STATE_PARAM_NAMES: readonly string[] = [
  ...Object.values(PUBLIC_CARD_FILTER_LIST_SEARCH_PARAMS),
  PUBLIC_CARD_SORT_PARAM,
  PUBLIC_CARD_GAME_PARAM,
  PUBLIC_CARD_FINISH_PARAM,
];

export const PUBLIC_CARDS_RATE_LIMITED_STATUS = 429;

export const PUBLIC_PAGE_ROOT_CLASS = "public-page";
