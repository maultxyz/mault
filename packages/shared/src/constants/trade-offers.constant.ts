import type { TradeOfferLocationSectionKind } from "../interfaces/trade-offers.interface";

export const TRADE_OFFER_STATUSES = ["pending", "accepted", "declined"] as const;
export const TRADE_OFFERS_CHANGED_EVENT = "trade_offers_changed";
export const SHARE_LINK_GUEST_KEY_HEADER = "X-Guest-Key";
export const RESTRICTED_SHARE_LINK_MINUTES = 60;
export const TRADE_OFFER_GUEST_NAME_MAX_LENGTH = 60;
export const TRADE_OFFER_GUEST_CONTACT_MAX_LENGTH = 120;
export const TRADE_OFFER_GUEST_NOTE_MAX_LENGTH = 500;
export const TRADE_OFFER_WANTED_CARDS_MAX = 20;
export const TRADE_OFFER_OFFERED_CARDS_MAX = 50;
export const TRADE_OFFER_CARD_QUANTITY_MAX = 99;
export const TRADE_OFFER_PENDING_PER_GUEST_MAX = 5;
export const TRADE_OFFER_SEARCH_QUERY_MAX_LENGTH = 100;
export const TRADE_OFFER_CARD_SORTS = ["value", "name", "set"] as const;
export const DEFAULT_TRADE_OFFER_CARD_SORT = "value";
export const TRADE_OFFER_COLLAPSED_ROW_COUNT = 8;
export const TRADE_OFFER_FILTER_ROW_THRESHOLD = 8;
export const TRADE_OFFER_PICK_FLUSH_DELAY_MS = 400;

export const TRADE_OFFER_LOCATION_SECTION_ORDER: Record<TradeOfferLocationSectionKind, number> = {
  storage: 0,
  bin: 1,
  collection: 2,
  missing: 3,
};
