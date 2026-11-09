import type { CardHoldsChangedEvent } from "@magic-vault/shared";

export type CardHoldScope =
  | { kind: "collection"; orgId: string; collectionId: number }
  | { kind: "storage"; orgId: string; locationId: number };

export interface PlaceCardHoldInput {
  scope: CardHoldScope;
  scanId: string;
  guestName: string;
  guestNote: string | null;
  guestKeyHash: string;
  holdMinutes: number;
}

export type PlaceCardHoldResult =
  | { status: "created"; changed: CardHoldsChangedEvent }
  | { status: "card-not-found" }
  | { status: "already-held" }
  | { status: "guest-limit-reached" };

export interface CardHoldOwnerFilter {
  collectionGuid?: string;
  locationGuid?: string;
}

export interface PublicCardHoldLink {
  scope: CardHoldScope;
  holdMinutes: number | null;
}
