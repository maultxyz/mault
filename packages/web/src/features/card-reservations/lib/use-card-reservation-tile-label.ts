import { useCardReservationsContext } from "@/lib/card-reservations-context";
import { useTranslation } from "react-i18next";

export function useCardReservationTileLabel(
  scanId: string,
): { text: string; isMine: boolean } | null {
  const { t } = useTranslation("cards");
  const reservations = useCardReservationsContext();
  if (!reservations) return null;
  const mine = reservations.myReservationFor(scanId);
  if (mine) {
    return {
      text:
        mine.status !== "ready"
          ? t("reservations.tileInLine")
          : mine.isReadyForPickup
            ? t("reservations.tileReadyForPickup")
            : t("reservations.tileYours"),
      isMine: true,
    };
  }
  return reservations.queueLengthOf(scanId) > 0
    ? { text: t("reservations.tileReserved"), isMine: false }
    : null;
}
