import { GUEST_CANCEL_REQUEST_KEY_PREFIX } from "@/lib/constants/card-reservations";
import type { GuestCardReservationCancelTarget } from "@/lib/interfaces/card-reservations";

export function guestCancelKey(target: GuestCardReservationCancelTarget): string {
  return target.kind === "request"
    ? `${GUEST_CANCEL_REQUEST_KEY_PREFIX}${target.requestGuid}`
    : target.reservationGuid;
}

export function guestCancelPath(target: GuestCardReservationCancelTarget): string {
  return target.kind === "request"
    ? `/requests/${encodeURIComponent(target.requestGuid)}`
    : `/${encodeURIComponent(target.reservationGuid)}`;
}
