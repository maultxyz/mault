import type {
  StorageLocationCard,
  TradeOfferRequest,
  TradeOfferStatus,
  TradeOffersChangedEvent,
  TradeOfferWantedPlacement,
} from "@magic-vault/shared";
import type { tradeOffers } from "../../db/schema";

export type TradeOfferRow = typeof tradeOffers.$inferSelect;

export interface CreateTradeOfferInput {
  scope: TradeOfferScope;
  request: TradeOfferRequest;
  guestKeyHash: string;
  guestUserId: string | null;
}

export interface ClaimGuestTradeOffersInput {
  guestUserId: string;
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
  showsPrices: boolean;
  requiresGuestContact: boolean;
}

export type TradeOfferScope =
  | { kind: "collection"; orgId: string; collectionId: number }
  | { kind: "storage"; orgId: string; locationId: number };

export interface TradeOfferResponse {
  removedCards: { scanId: string; collectionGuid: string }[];
  imageKeys: (string | null)[];
}

export interface RemoveTradeOfferWantedCardsInput {
  orgId: string;
  userId: string;
  tradeOfferGuid: string;
  guestName: string;
  scanIds: string[];
}

export interface RespondToTradeOfferInput {
  orgId: string;
  userId: string;
  tradeOfferGuid: string;
  status: Exclude<TradeOfferStatus, "pending">;
  removeWantedCardsWhenPicked: boolean;
}

export interface PickTradeOfferCardsInput {
  orgId: string;
  userId: string;
  tradeOfferGuid: string;
  pickedScanIds: string[] | "all";
}

export type PickTradeOfferCardsResult =
  | { status: "picked"; response: TradeOfferResponse; remainingScanIds: string[] }
  | { status: "not-found" }
  | { status: "nothing-to-pick" };

export interface CurrentTradeOfferWantedCards {
  cardsByScanId: Map<string, StorageLocationCard>;
  placementsByScanId: Map<string, TradeOfferWantedPlacement>;
}
