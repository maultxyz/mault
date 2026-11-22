import {
  CARD_RESERVATION_HOLDER_QUEUE_POSITION,
  type PublicCardReservation,
} from "@magic-vault/shared";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export function useCardReservationStatusText() {
  const { t, i18n } = useTranslation("cards");
  return useCallback(
    (reservation: PublicCardReservation): string => {
      if (reservation.status === "ready") {
        const heldKey = reservation.isReadyForPickup
          ? "reservations.readyForPickupUntil"
          : "reservations.heldUntil";
        return reservation.holdExpiresAt
          ? t(heldKey, {
              date: new Date(reservation.holdExpiresAt).toLocaleString(i18n.language, {
                dateStyle: "medium",
                timeStyle: "short",
              }),
            })
          : t("reservations.held");
      }
      return t("reservations.aheadOfYou", {
        count: (reservation.queuePosition ?? 0) - CARD_RESERVATION_HOLDER_QUEUE_POSITION,
      });
    },
    [t, i18n.language],
  );
}
