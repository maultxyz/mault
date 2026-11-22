import {
  CARD_RESERVATION_PICK_BUSY_KEY_PREFIX,
  CARD_RESERVATION_REQUEST_BUSY_KEY_PREFIX,
} from "@/lib/constants/card-reservations";
import type { CardReservationActionTarget } from "@/lib/interfaces/card-reservations";

export function cardReservationBusyKey(
  target: CardReservationActionTarget,
  action: "close" | "pick" = "close",
): string {
  if (action === "pick") return `${CARD_RESERVATION_PICK_BUSY_KEY_PREFIX}${target.group.requestGuid}`;
  return target.kind === "request"
    ? `${CARD_RESERVATION_REQUEST_BUSY_KEY_PREFIX}${target.group.requestGuid}`
    : target.reservation.guid;
}
