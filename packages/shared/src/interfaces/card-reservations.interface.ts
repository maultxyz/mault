import type {
  CARD_RESERVATION_ACTIVE_STATUSES,
  CARD_RESERVATION_GUEST_ALERTS,
  CARD_RESERVATION_HOLD_DAY_CHOICES,
  CARD_RESERVATION_LIST_VIEWS,
  CARD_RESERVATION_OPEN_STAGES,
  CARD_RESERVATION_STAGES,
  CARD_RESERVATION_STATUSES,
} from "../constants/card-reservations.constant";
import type { CardCondition } from "./card-condition.interface";
import type { PriceSource } from "./price-source.interface";
import type { TradeOfferWantedPlacement } from "./trade-offers.interface";

export type CardReservationStatus = (typeof CARD_RESERVATION_STATUSES)[number];

export type CardReservationActiveStatus = (typeof CARD_RESERVATION_ACTIVE_STATUSES)[number];

export type CardReservationHoldDays = (typeof CARD_RESERVATION_HOLD_DAY_CHOICES)[number];

export type CardReservationListView = (typeof CARD_RESERVATION_LIST_VIEWS)[number];

export type CardReservationStage = (typeof CARD_RESERVATION_STAGES)[number];

export type CardReservationOpenStage = (typeof CARD_RESERVATION_OPEN_STAGES)[number];

export type CardReservationGuestAlert = (typeof CARD_RESERVATION_GUEST_ALERTS)[number];

export interface CardReservationCard {
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

export interface PublicCardReservation {
  guid: string;
  requestGuid: string;
  scanId: string | null;
  card: CardReservationCard;
  status: CardReservationStatus;
  queuePosition: number | null;
  queueLength: number;
  holdExpiresAt: string | null;
  isReadyForPickup: boolean;
  createdAt: string;
  closedAt: string | null;
}

export interface ReservedPublicCard {
  scanId: string;
  queueLength: number;
}

export interface PublicCardReservations {
  reservedCards: ReservedPublicCard[];
  mine: PublicCardReservation[];
}

export interface CardReservation extends PublicCardReservation {
  guestName: string;
  guestContact: string;
  guestNote: string | null;
  isFromAccount?: boolean;
  catalogName: string | null;
  price: number | null;
  priceSource: PriceSource;
  placement: TradeOfferWantedPlacement | null;
  pickOrderGuid: string | null;
  pickOrderName: string | null;
}

export interface CardReservationPickOrder {
  guid: string;
  name: string;
}

export interface CreatedCardReservationPick {
  orderGuid: string;
  cardCount: number;
}

export interface CollectedCardReservations {
  collectedCount: number;
  saleTotal: number;
  hasMissingPrices: boolean;
}

export interface ReleasedCardReservations {
  releasedCount: number;
}

export interface CardReservationRequestGroup {
  requestGuid: string;
  guestName: string;
  guestContact: string;
  guestNote: string | null;
  isFromAccount: boolean | null;
  catalogName: string | null;
  createdAt: string;
  reservations: CardReservation[];
  heldCount: number;
  waitingCount: number;
  readyForPickupCount: number;
  beingPickedCount: number;
  toPullCount: number;
  pickOrders: CardReservationPickOrder[];
  heldPriceTotal: number;
  hasMissingHeldPrices: boolean;
}

export interface CardReservationsChangedEvent {
  createdReservation: {
    guestName: string;
    cardNames: string[];
    heldCount: number;
  } | null;
}

export interface CreatedCardReservations {
  heldCount: number;
  waitingCount: number;
}

export interface CardReservationQueueEntry {
  id: number;
  status: CardReservationActiveStatus;
  holdDays: number;
  holdExpiresAt: Date | null;
}

export interface CardReservationQueueSettlement {
  expiredId: number | null;
  promoted: { id: number; holdStartedAt: Date; holdExpiresAt: Date } | null;
}

export interface MyCardReservation extends PublicCardReservation {
  catalogName: string | null;
  catalogUrl: string | null;
  guestName: string;
  guestAlert: CardReservationGuestAlert | null;
  guestAlertAt: string | null;
}

export interface ClaimMyCardReservationsResult {
  claimedCount: number;
}
