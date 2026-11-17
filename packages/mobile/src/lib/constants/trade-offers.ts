import type { TradeOfferStatusTones } from "@/lib/interfaces/trade-offers";

export const TRADE_OFFERS_QUERY_KEY = "trade-offers";
export const TRADE_OFFER_STATUS_TONES: TradeOfferStatusTones = {
  pending: "info",
  accepted: "success",
  declined: "destructive",
};
export const TRADE_OFFERS_SKELETON_ROWS = 4;
export const COLLECTION_CARDS_QUERY_ROOT = "collection-cards";
export const TRADE_OFFER_TWO_COLUMN_MIN_WINDOW_WIDTH = 768;
export const TRADE_OFFER_SIDES = ["wanted", "offered"] as const;
export const OUTGOING_TRADE_OFFERS_QUERY_KEY = "outgoing-trade-offers";
export const TRADES_BOXES = ["received", "sent"] as const;
export const NEW_TRADE_LINK_PARAM_VALUE = "1";
export const TRADE_LINK_SOURCE_SEPARATOR = ":";
export const IN_PERSON_TRADE_QUOTE_QUERY_KEY = "in-person-trade-quote";
export const IN_PERSON_TRADE_SEARCH_QUERY_KEY = "in-person-trade-search";
export const IN_PERSON_TRADE_SEARCH_MIN_LENGTH = 2;
export const IN_PERSON_TRADE_SEARCH_RESULTS_MAX = 30;
