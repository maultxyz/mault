import type { TradeOfferStatus } from "@magic-vault/shared";

export const TRADE_OFFERS_QUERY_KEY = "trade-offers";
export const PUBLIC_TRADE_OFFERS_QUERY_KEY = "public-trade-offers";
export const TRADE_OFFER_LINK_PATHS = {
  collection: "monitor-link",
  storage: "storage-share-link",
} as const;
export const TRADE_OFFER_STATUS_BADGE_VARIANTS: Record<
  TradeOfferStatus,
  "info" | "success" | "destructive"
> = {
  pending: "info",
  accepted: "success",
  declined: "destructive",
};
export const DEFAULT_TRADE_OFFER_LANGUAGE = "en";
export const TRADE_OFFER_SEARCH_MIN_LENGTH = 2;
export const PUBLIC_GAMES_QUERY_KEY = "public-games";
export const GUEST_TRADE_OFFERS_ACCORDION_VALUE = "sent-offers";
