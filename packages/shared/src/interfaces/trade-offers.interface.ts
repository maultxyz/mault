import type { TRADE_OFFER_STATUSES } from "../constants/trade-offers.constant";
import type { CardCondition } from "./card-condition.interface";
import type { PriceSource } from "./price-source.interface";

export type TradeOfferStatus = (typeof TRADE_OFFER_STATUSES)[number];

export type TradeOfferLinkKind = "collection" | "storage";

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

export interface PublicTradeOffer {
  guid: string;
  status: TradeOfferStatus;
  wanted: TradeOfferWantedCard[];
  offered: TradeOfferOfferedCard[];
  createdAt: string;
  respondedAt: string | null;
}

export interface TradeOffer extends PublicTradeOffer {
  wantedPrices: (number | null)[];
  offeredPrices: (number | null)[];
  wantedValue: number;
  offeredValue: number;
  priceSource: PriceSource;
  guestName: string;
  guestContact: string;
  guestNote: string | null;
  linkKind: TradeOfferLinkKind;
  sourceName: string | null;
}

export interface TradeOffersChangedEvent {
  createdOffer: { guestName: string; wantedCount: number; offeredCount: number } | null;
}
