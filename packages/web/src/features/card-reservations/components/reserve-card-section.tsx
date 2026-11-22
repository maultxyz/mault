import { Button } from "@/components/ui/button";
import { useCardReservationStatusText } from "@/features/card-reservations/lib/use-card-reservation-status-text";
import { useCardReservationsContext } from "@/lib/card-reservations-context";
import type { ReserveCardSectionProps } from "@/lib/interfaces/card-reservations";
import { IconBookmark, IconBookmarkFilled, IconLoader2 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ReserveCardSection({ entry }: ReserveCardSectionProps) {
  const { t } = useTranslation("cards");
  const reservations = useCardReservationsContext();
  const statusText = useCardReservationStatusText();
  if (!reservations) return null;
  const mine = reservations.myReservationFor(entry.scanId);
  const queueLength = reservations.queueLengthOf(entry.scanId);

  if (mine) {
    const cancelTarget = { kind: "reservation" as const, reservationGuid: mine.guid };
    const isCancelling = reservations.isCancelling(cancelTarget);
    return (
      <div className="mt-2 flex flex-col items-start gap-1.5" role="status">
        <p className="flex items-center gap-1.5 text-sm font-medium text-success-foreground">
          <IconBookmarkFilled className="size-4 shrink-0" aria-hidden />
          {mine.status === "ready"
            ? mine.isReadyForPickup
              ? t("reservations.youCanPickUp")
              : t("reservations.youReserved")
            : t("reservations.youAreInLine", { position: mine.queuePosition ?? 0 })}
        </p>
        <p className="text-xs text-foreground/70">{statusText(mine)}</p>
        <Button
          variant="outline"
          className="max-md:w-full"
          disabled={isCancelling}
          onClick={() => reservations.cancel(cancelTarget)}
        >
          {isCancelling && <IconLoader2 className="animate-spin" />}
          {t("reservations.cancel")}
        </Button>
      </div>
    );
  }

  const isInCart = reservations.isInCart(entry.scanId);
  return (
    <div className="mt-2 flex flex-col items-start gap-1.5">
      <Button
        variant={isInCart ? "selected" : "outline"}
        className="max-md:w-full"
        aria-pressed={isInCart}
        onClick={() => reservations.toggleInCart(entry)}
      >
        <IconBookmark />
        {isInCart ? t("reservations.inCart") : t("reservations.addToCart")}
      </Button>
      <p className="text-xs text-foreground/70">
        {queueLength > 0
          ? t("reservations.reservedNote", { count: queueLength })
          : t("reservations.reserveNote", { count: reservations.holdDays })}
      </p>
    </div>
  );
}
