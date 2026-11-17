import type {
  IN_PERSON_TRADE_CASH_DIRECTIONS,
  TRADE_OFFER_CARD_SORTS,
  TRADE_OFFER_LINK_KINDS,
  TRADE_OFFER_STATUSES,
} from "../constants/trade-offers.constant";
import type { CardCondition } from "./card-condition.interface";
import type { PriceSource } from "./price-source.interface";

export type TradeOfferStatus = (typeof TRADE_OFFER_STATUSES)[number];

export type TradeOfferLinkKind = (typeof TRADE_OFFER_LINK_KINDS)[number];

export type InPersonTradeCashDirection = (typeof IN_PERSON_TRADE_CASH_DIRECTIONS)[number];

export interface InPersonTradeCash {
  amount: number;
  direction: InPersonTradeCashDirection;
}

export interface CreatedInPersonTrade {
  guid: string;
}

export interface TradeOfferWantedCard {
  scanId: string;
  gameKey: string | null;
  name: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  imageUrl: string | null;
  condition: CardCondition;
  isFoil: boolean;
  foilType: string | null;
  priceAtTrade?: number | null;
}

export interface TradeOfferOfferedCard {
  gameKey: string;
  lang: string;
  cardId: string;
  name: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  imageUrl: string | null;
  quantity: number;
  condition: CardCondition;
  isFoil: boolean;
}

export interface TradeOfferCardOption {
  gameKey: string;
  lang: string;
  cardId: string;
  name: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  imageUrl: string | null;
}

export interface TradeOfferCardOptionPage {
  cards: TradeOfferCardOption[];
  nextOffset: number | null;
}

export interface TradeOfferCash {
  amount: number;
  currency: string;
}

export type TradeOfferOfferKind = "cards" | "cash" | "cardsAndCash" | "nothing";

export interface PublicTradeOffer {
  guid: string;
  status: TradeOfferStatus;
  wanted: TradeOfferWantedCard[];
  offered: TradeOfferOfferedCard[];
  offeredCash: TradeOfferCash | null;
  createdAt: string;
  respondedAt: string | null;
}

export interface TradeOfferWantedPlacement {
  collectionName: string;
  storageLocationGuid: string | null;
  storageLocationName: string | null;
  storagePosition: number | null;
  binNumber: number | null;
}

export interface TradeOffer extends PublicTradeOffer {
  wantedPrices: (number | null)[];
  wantedPlacements?: (TradeOfferWantedPlacement | null)[];
  remainingPickScanIds?: string[] | null;
  offeredPrices: (number | null)[];
  wantedValue: number;
  offeredValue: number;
  givenCash?: TradeOfferCash | null;
  priceSource: PriceSource;
  guestName: string;
  guestContact: string;
  guestNote: string | null;
  linkKind: TradeOfferLinkKind;
  sourceName: string | null;
}

export interface OutgoingTradeOffer extends PublicTradeOffer {
  linkKind: TradeOfferLinkKind;
  sentToName: string | null;
  guestName: string;
  guestContact: string;
  guestNote: string | null;
}

export interface ClaimOutgoingTradeOffersResult {
  claimedCount: number;
}

export interface TradeOffersChangedEvent {
  createdOffer: {
    guestName: string;
    wantedCount: number;
    offeredCount: number;
    offeredCash?: TradeOfferCash | null;
  } | null;
}

export type TradeOfferCardSort = (typeof TRADE_OFFER_CARD_SORTS)[number];

export type TradeOfferReviewCard = TradeOfferWantedCard | TradeOfferOfferedCard;

export interface TradeOfferCardGroup {
  key: string;
  card: TradeOfferReviewCard;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  scanIds: string[];
  placements: (TradeOfferWantedPlacement | null)[];
}

export type TradeOfferPlacementSummary =
  | { kind: "storage"; locationName: string; positions: number[] }
  | { kind: "bin"; collectionName: string; binNumbers: number[] }
  | { kind: "collection"; collectionName: string }
  | { kind: "missing"; count: number };

export type TradeOfferLocationSectionKind = "storage" | "bin" | "collection" | "missing";

export interface TradeOfferLocationSection {
  key: string;
  kind: TradeOfferLocationSectionKind;
  name: string;
  binNumber: number | null;
  rows: TradeOfferCardGroup[];
}

export type TradeOfferPickListSectionKind = TradeOfferLocationSectionKind | "picked";

export interface TradeOfferPickListItem {
  scanId: string;
  card: TradeOfferWantedCard;
  price: number | null;
  placement: TradeOfferWantedPlacement | null;
  isPicked: boolean;
}

export interface TradeOfferPickListSection {
  key: string;
  kind: TradeOfferPickListSectionKind;
  name: string;
  binNumber: number | null;
  items: TradeOfferPickListItem[];
}

export interface TradeOfferPickProgress {
  pickedCount: number;
  totalCount: number;
}

export interface TradeOfferPickSplit {
  pickedScanIds: string[];
  remainingScanIds: string[];
}

export interface TradeOfferPickResult {
  removedCount: number;
  remainingScanIds: string[];
}

export interface TradeOfferQuote {
  priceSource: PriceSource;
  wantedPrices: (number | null)[];
  offeredPrices: (number | null)[];
  wantedValue: number;
  offeredCardsValue: number;
}

export interface TradeOfferBalance {
  getValue: number;
  giveValue: number;
  difference: number;
  hasMissingPrices: boolean;
}

export interface TradeOfferSideTotals {
  totalCards: number;
  uniqueCards: number;
  totalValue: number;
}
