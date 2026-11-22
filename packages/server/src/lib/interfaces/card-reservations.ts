import type {
  CardReservationActiveStatus,
  CardReservationRequest,
  CardReservationsChangedEvent,
  CollectedCardReservations,
  CreatedCardReservations,
} from "@magic-vault/shared";
import type { cardReservations } from "../../db/schema";
import type { PublicCardBrowseScope } from "./public-cards";
import type { ShopCatalogClaims } from "./share-tokens";

export type CardReservationRow = typeof cardReservations.$inferSelect;

export interface ActiveCardReservationRow {
  id: number;
  collectionCardId: number;
  guestKeyHash: string;
  status: CardReservationActiveStatus;
  holdDays: number;
  holdExpiresAt: Date | null;
  cardExists: boolean;
}

export interface CardReservationSettlementPlan {
  unavailableIds: number[];
  expiredIds: number[];
  promotions: { id: number; holdStartedAt: Date; holdExpiresAt: Date }[];
}

export interface CreateCardReservationsInput {
  catalog: ShopCatalogClaims;
  scope: PublicCardBrowseScope;
  request: CardReservationRequest;
  guestKeyHash: string;
}

export type CreateCardReservationsResult =
  | { status: "created"; created: CreatedCardReservations; changed: CardReservationsChangedEvent }
  | { status: "card-not-found" }
  | { status: "already-reserved" }
  | { status: "queue-full" }
  | { status: "guest-limit-reached" };

export interface CancelGuestCardReservationInput {
  orgId: string;
  reservationGuid: string;
  guestKeyHash: string;
}

export interface CreateCardReservationPickInput {
  orgId: string;
  userId: string;
  requestGuid: string;
  name: string;
}

export type CardReservationSelection =
  | { kind: "reservation"; reservationGuid: string }
  | { kind: "request"; requestGuid: string };

export interface CloseCardReservationsInput {
  orgId: string;
  userId: string;
  selection: CardReservationSelection;
}

export type CollectCardReservationsResult =
  | {
      status: "collected";
      collected: CollectedCardReservations;
      removedCards: { scanId: string; collectionGuid: string }[];
      imageKeys: (string | null)[];
    }
  | { status: "not-found" }
  | { status: "not-holder" }
  | { status: "card-gone" };
