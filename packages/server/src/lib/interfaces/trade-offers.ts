import type { TradeOfferRequest, TradeOffersChangedEvent } from "@magic-vault/shared";
import type { tradeOffers } from "../../db/schema";

export type TradeOfferRow = typeof tradeOffers.$inferSelect;

export interface CreateTradeOfferInput {
  scope: TradeOfferScope;
  request: TradeOfferRequest;
  guestKeyHash: string;
}

export type CreateTradeOfferResult =
  | { status: "created"; guid: string; changed: TradeOffersChangedEvent }
  | { status: "guest-limit-reached" }
  | { status: "wanted-not-found" }
  | { status: "offered-not-found" };

export interface PublicTradeOfferLink {
  scope: TradeOfferScope;
  allowsTradeOffers: boolean;
}

export type TradeOfferScope =
  | { kind: "collection"; orgId: string; collectionId: number }
  | { kind: "storage"; orgId: string; locationId: number };

export interface TradeOfferResponse {
  removedCards: { scanId: string; collectionGuid: string }[];
  imageKeys: (string | null)[];
}
