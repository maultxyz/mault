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
