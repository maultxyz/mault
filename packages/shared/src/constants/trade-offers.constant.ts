import type {
  TradeOfferLocationSectionKind,
  TradeOfferOfferKind,
} from "../interfaces/trade-offers.interface";

export const TRADE_OFFER_STATUSES = ["pending", "accepted", "declined"] as const;
export const TRADE_OFFERS_CHANGED_EVENT = "trade_offers_changed";
export const SHARE_LINK_GUEST_KEY_HEADER = "X-Guest-Key";
export const OUTGOING_TRADE_OFFERS_API_PATH = "/api/trade-offers/outgoing";
export const CLAIM_OUTGOING_TRADE_OFFERS_API_PATH = "/api/trade-offers/outgoing/claim";
export const OUTGOING_TRADE_OFFERS_LIST_MAX = 100;
export const RESTRICTED_SHARE_LINK_MINUTES = 60;
export const TRADE_OFFER_GUEST_NAME_MAX_LENGTH = 60;
export const TRADE_OFFER_GUEST_CONTACT_MAX_LENGTH = 120;
export const TRADE_OFFER_GUEST_NOTE_MAX_LENGTH = 500;
export const TRADE_OFFER_WANTED_CARDS_MAX = 20;
export const TRADE_OFFER_OFFERED_CARDS_MAX = 50;
export const TRADE_OFFER_CARD_QUANTITY_MAX = 99;
export const TRADE_OFFER_CASH_AMOUNT_MAX = 100_000;
export const TRADE_OFFER_CASH_INPUT_PATTERN = /^\d+([.,]\d{1,2})?$/;
export const TRADE_OFFER_PENDING_PER_GUEST_MAX = 5;
export const TRADE_OFFER_SEARCH_QUERY_MAX_LENGTH = 100;
export const TRADE_OFFER_CARD_SORTS = ["value", "name", "set"] as const;
export const DEFAULT_TRADE_OFFER_CARD_SORT = "value";
export const PRICE_TRADE_OFFER_CARD_SORT = "value";
export const UNPRICED_DEFAULT_TRADE_OFFER_CARD_SORT = "name";
export const TRADE_OFFER_COLLAPSED_ROW_COUNT = 8;
export const TRADE_OFFER_FILTER_ROW_THRESHOLD = 8;
export const TRADE_OFFER_PICK_FLUSH_DELAY_MS = 400;

export const TRADE_OFFER_LOCATION_SECTION_ORDER: Record<TradeOfferLocationSectionKind, number> = {
  storage: 0,
  bin: 1,
  collection: 2,
  missing: 3,
};

export const TRADE_OFFER_TRAY_MESSAGE_KEYS: Record<TradeOfferOfferKind, string> = {
  cards: "tradeOffers.trayMessage",
  cash: "tradeOffers.trayMessageCash",
  cardsAndCash: "tradeOffers.trayMessageCardsAndCash",
  nothing: "tradeOffers.trayMessageNothing",
};

export const TRADE_OFFER_THEY_OFFER_TITLE_KEYS: Record<TradeOfferOfferKind, string> = {
  cards: "tradeOffers.theyOffer",
  cash: "tradeOffers.theyOfferCash",
  cardsAndCash: "tradeOffers.theyOffer",
  nothing: "tradeOffers.theyOfferNothing",
};

export const TRADE_OFFER_YOU_OFFERED_TITLE_KEYS: Record<TradeOfferOfferKind, string> = {
  cards: "tradeOffers.sent.youOffer",
  cash: "tradeOffers.sent.youOfferCash",
  cardsAndCash: "tradeOffers.sent.youOffer",
  nothing: "tradeOffers.sent.youOfferNothing",
};
