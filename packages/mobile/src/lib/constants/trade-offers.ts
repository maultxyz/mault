import type { TradeOfferStatusTones } from "@/lib/interfaces/trade-offers";

export const TRADE_OFFERS_QUERY_KEY = "trade-offers";
export const TRADE_OFFER_STATUS_TONES: TradeOfferStatusTones = {
  pending: "info",
  accepted: "success",
  declined: "destructive",
};
export const TRADE_OFFERS_SKELETON_ROWS = 4;
