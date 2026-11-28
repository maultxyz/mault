import type { TradeOfferStatus } from "@magic-vault/shared";

export const TRADE_OFFERS_QUERY_KEY = "trade-offers";
export const TRADE_OFFER_PICK_UNDO_TOAST_ID_PREFIX = "trade-offer-pick-undo-";
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
export const TRADES_PATH = "/app/trades";
export const TRADE_OFFERS_SKELETON_ROWS = 4;
export const TRADE_OFFER_ROW_THUMBNAIL_LIMIT = 4;
export const TRADE_OFFER_ROW_GRID_CLASS =
  "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(8rem,auto)] items-center gap-4";
export const TRADE_OFFER_PATH = `${TRADES_PATH}/:offerGuid`;
export const IN_PERSON_TRADE_PATH = `${TRADES_PATH}/new`;
export const IN_PERSON_TRADE_QUOTE_QUERY_KEY = "in-person-trade-quote";
export const IN_PERSON_TRADE_OWNED_SEARCH_QUERY_KEY = "in-person-trade-owned-search";
export const IN_PERSON_TRADE_CATALOG_SEARCH_QUERY_KEY = "in-person-trade-catalog-search";
export const IN_PERSON_TRADE_SEARCH_RESULTS_MAX = 20;
export const IN_PERSON_TRADE_COLLECTION_CARDS_QUERY_KEY = "in-person-trade-collection-cards";
export const IN_PERSON_TRADE_COLLECTION_CARDS_PAGE_SIZE = 30;
export const IN_PERSON_GIVEN_ALL_COLLECTIONS = "all";
export const TRADE_OFFER_SIDES = ["wanted", "offered"] as const;
export const OUTGOING_TRADE_OFFERS_QUERY_KEY = "outgoing-trade-offers";
export const TRADE_OFFER_DRAFT_STORAGE_KEY_PREFIX = "mault:trade-offer-draft:";
export const TRADES_BOX_PARAM = "box";
export const TRADES_BOXES = ["received", "sent", "reservations"] as const;
export const SENT_TRADES_PATH = `${TRADES_PATH}?${TRADES_BOX_PARAM}=sent`;
export const MY_RESERVATIONS_PATH = `${TRADES_PATH}?${TRADES_BOX_PARAM}=reservations`;
export const SENT_TRADE_OFFER_PATH = `${TRADES_PATH}/sent/:offerGuid`;

export function tradeOfferPath(offerGuid: string): string {
  return `${TRADES_PATH}/${offerGuid}`;
}

export function sentTradeOfferPath(offerGuid: string): string {
  return `${TRADES_PATH}/sent/${offerGuid}`;
}
