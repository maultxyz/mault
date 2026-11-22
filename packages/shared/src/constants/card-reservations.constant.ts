export const CARD_RESERVATION_ACTIVE_STATUSES = ["waiting", "ready"] as const;
export const CARD_RESERVATION_CLOSED_STATUSES = [
  "collected",
  "cancelled",
  "released",
  "expired",
  "unavailable",
] as const;
export const CARD_RESERVATION_STATUSES = [
  ...CARD_RESERVATION_ACTIVE_STATUSES,
  ...CARD_RESERVATION_CLOSED_STATUSES,
] as const;
export const CARD_RESERVATION_OPEN_STAGES = [
  "readyForPickup",
  "beingPicked",
  "toPull",
  "waiting",
] as const;
export const CARD_RESERVATION_STAGES = [
  ...CARD_RESERVATION_OPEN_STAGES,
  ...CARD_RESERVATION_CLOSED_STATUSES,
] as const;
export const CARD_RESERVATION_PICK_NAME_MAX_LENGTH = 120;
export const CARD_RESERVATIONS_CHANGED_EVENT = "card_reservations_changed";
export const CARD_RESERVATION_HOLD_DAY_CHOICES = [1, 2, 3, 7, 14] as const;
export const DEFAULT_CARD_RESERVATION_HOLD_DAYS = 3;
export const DEFAULT_SHOP_CATALOG_ALLOWS_RESERVATIONS = false;
export const CARD_RESERVATION_QUEUE_MAX = 10;
export const CARD_RESERVATIONS_ACTIVE_PER_GUEST_MAX = 10;
export const CARD_RESERVATION_CARDS_PER_REQUEST_MAX = CARD_RESERVATIONS_ACTIVE_PER_GUEST_MAX;
export const CARD_RESERVATION_LIST_VIEWS = ["active", "closed"] as const;
export const CARD_RESERVATION_LIST_VIEW_PARAM = "view";
export const CARD_RESERVATIONS_CLOSED_LIST_MAX = 100;
export const CARD_RESERVATION_HOLDER_QUEUE_POSITION = 1;
export const CARD_RESERVATIONS_WEB_PATH = "/app/orders/reservations";
export const CARD_RESERVATION_GUEST_ALERTS = [
  "held",
  "readyForPickup",
  "expired",
  "released",
  "unavailable",
] as const;
export const MY_CARD_RESERVATIONS_API_PATH = "/api/card-reservations/mine";
export const CLAIM_MY_CARD_RESERVATIONS_API_PATH = "/api/card-reservations/mine/claim";
export const SEEN_MY_CARD_RESERVATION_ALERTS_API_PATH = "/api/card-reservations/mine/alerts/seen";
export const MY_CARD_RESERVATIONS_LIST_MAX = 100;
export const MY_CARD_RESERVATION_ALERTS_SEEN_MAX = 100;
