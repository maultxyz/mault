import { IN_PERSON_TRADE_RECEIVED_CARDS_MAX, TRADE_OFFER_CARD_QUANTITY_MAX } from "@magic-vault/shared";
import type { StatusTone } from "@/lib/interfaces/theme";
import type { ReceivedTradeCardLimits, TradeScanNotice } from "@/lib/interfaces/trade";

export const TRADE_LINK_BASE_PATHS = {
  collection: "monitor-link",
  storage: "storage-share-link",
} as const;
export const TRADE_LINK_CARDS_PAGE_SIZE = 48;
export const TRADE_LINK_INFO_QUERY_KEY = "trade-link-info";
export const TRADE_LINK_CARDS_QUERY_KEY = "trade-link-cards";
export const TRADE_OFFER_QUOTE_QUERY_KEY = "trade-offer-quote";
export const TRADE_SCAN_TARGET_IN_PERSON = "in-person";
export const TRADE_OFFERS_SENT_BOX = "sent";
export const IN_PERSON_RECEIVED_CARD_LIMITS: ReceivedTradeCardLimits = {
  maxCards: IN_PERSON_TRADE_RECEIVED_CARDS_MAX,
  maxQuantity: TRADE_OFFER_CARD_QUANTITY_MAX,
};
export const TRADE_QUANTITY_VALUE_MIN_WIDTH = 28;
export const OFFERED_TRADE_CARD_FOIL_OPTION = "foil";
export const TRADE_SCAN_NOTICE_TONES: Record<TradeScanNotice["kind"], StatusTone> = {
  added: "success",
  "no-match": "warning",
  failed: "destructive",
};
