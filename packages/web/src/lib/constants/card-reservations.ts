import type { CardReservationStage, CardReservationStatus } from "@magic-vault/shared";

export const PUBLIC_CARD_RESERVATIONS_QUERY_KEY = "public-card-reservations";
export const PUBLIC_CARD_RESERVATIONS_STALE_MS = 30_000;
export const CARD_RESERVATIONS_QUERY_KEY = "reservations";
export const CARD_RESERVATION_STATUS_BADGE_VARIANTS: Record<
  CardReservationStatus,
  "info" | "success" | "secondary" | "destructive"
> = {
  ready: "info",
  waiting: "info",
  collected: "success",
  cancelled: "secondary",
  released: "secondary",
  expired: "secondary",
  unavailable: "destructive",
};
export const CARD_RESERVATION_LIST_SKELETON_COUNT = 4;
export const PUBLIC_RESERVATION_COMPOSER_PARAM = "reserve";
export const PUBLIC_RESERVATION_COMPOSER_PARAM_VALUE = "1";
export const RESERVATION_CART_STORAGE_KEY_PREFIX = "mault:reservation-cart:";
export const CARD_RESERVATION_REQUEST_BUSY_KEY_PREFIX = "request:";
export const CARD_RESERVATION_PICK_BUSY_KEY_PREFIX = "pick:";
export const CARD_RESERVATION_STAGE_BADGE_VARIANTS: Record<
  CardReservationStage,
  "info" | "success" | "secondary" | "destructive" | "warning"
> = {
  readyForPickup: "success",
  beingPicked: "info",
  toPull: "warning",
  waiting: "secondary",
  collected: "success",
  cancelled: "secondary",
  released: "secondary",
  expired: "secondary",
  unavailable: "destructive",
};
export const CARD_RESERVATION_REQUEST_PARAM = "request";
