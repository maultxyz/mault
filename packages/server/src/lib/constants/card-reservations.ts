import type { CardReservationGuestAlert, CardReservationStatus } from "@magic-vault/shared";

export const CARD_RESERVATIONS_NOT_ALLOWED_MESSAGE = "This catalog doesn't take reservations.";
export const CARD_RESERVATION_INVALID_MESSAGE = "Invalid reservation.";
export const CARD_RESERVATION_GUEST_KEY_MESSAGE = "Missing or invalid guest key.";
export const CARD_RESERVATION_CARD_NOT_FOUND_MESSAGE = "A card you picked is no longer available.";
export const CARD_RESERVATION_ALREADY_RESERVED_MESSAGE = "You already reserved one of these cards.";
export const CARD_RESERVATION_QUEUE_FULL_MESSAGE = "The line for one of these cards is full.";
export const CARD_RESERVATION_GUEST_LIMIT_MESSAGE = "You have too many open reservations with this shop.";
export const CARD_RESERVATION_NOT_FOUND_MESSAGE = "This reservation is no longer open.";
export const CARD_RESERVATION_NOT_HOLDER_MESSAGE = "Only the reservation that is first in line can be picked up.";
export const CARD_RESERVATION_CARD_GONE_MESSAGE = "This card is no longer in your inventory.";
export const CARD_RESERVATION_INVALID_VIEW_MESSAGE = "Invalid reservation list.";
export const CARD_RESERVATION_PICK_INVALID_MESSAGE = "Invalid pick for this reservation.";
export const CARD_RESERVATION_NOTHING_TO_PULL_MESSAGE = "Every card held for this customer is already in a pick or ready for pickup.";

export const CARD_RESERVATIONS_PER_ORG_HOURLY_MAX = 60;
export const CARD_RESERVATIONS_PER_ORG_WINDOW_MS = 60 * 60 * 1000;
export const CARD_RESERVATIONS_GUEST_LIST_MAX = 50;
export const CARD_RESERVATIONS_LOCK_PREFIX = "card_reservations:";
export const CARD_RESERVATION_GUEST_ALERT_BY_STATUS: Partial<
  Record<CardReservationStatus, CardReservationGuestAlert>
> = {
  expired: "expired",
  released: "released",
  unavailable: "unavailable",
};
export const CARD_RESERVATION_OWN_ORG_MESSAGE = "You can't reserve cards from your own organization.";
export const CARD_RESERVATION_CLAIM_RATE_LIMITED_MESSAGE = "Too many attempts to link reservations. Try again in a minute.";
export const CARD_RESERVATION_CLAIM_RATE_LIMIT_REQUESTS = 10;
export const CARD_RESERVATION_CLAIM_RATE_LIMIT_WINDOW_MS = 60_000;
export const CARD_RESERVATION_CLAIM_RATE_LIMIT_SWEEP_SIZE = 10_000;
export const CARD_RESERVATION_ALERTS_INVALID_MESSAGE = "Invalid list of reservations.";
export const CARD_RESERVATION_DISCORD_NAMES_MAX = 10;
