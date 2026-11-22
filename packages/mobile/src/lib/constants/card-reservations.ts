import type { CardReservationStatus } from "@magic-vault/shared";
import type { PillProps } from "@/lib/interfaces/ui";

export const MY_CARD_RESERVATIONS_QUERY_KEY = "my-card-reservations";
export const MY_CARD_RESERVATION_ACTION_OPEN_CATALOG = "openCatalog";
export const MY_CARD_RESERVATION_ACTION_CANCEL = "cancel";
export const MY_CARD_RESERVATION_ACTION_CANCEL_ALL = "cancelAll";
export const MY_CARD_RESERVATION_OPTION_SEPARATOR = ":";
export const MY_CARD_RESERVATION_STATUS_TONES: Record<
  CardReservationStatus | "readyForPickup",
  NonNullable<PillProps["tone"]>
> = {
  readyForPickup: "success",
  ready: "info",
  waiting: "info",
  collected: "success",
  cancelled: "neutral",
  released: "neutral",
  expired: "neutral",
  unavailable: "destructive",
};
