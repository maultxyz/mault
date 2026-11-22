import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardReservationCardSummary } from "@/features/card-reservations/components/card-reservation-card-summary";
import { useCardReservationStatusText } from "@/features/card-reservations/lib/use-card-reservation-status-text";
import { useCardReservationsContext } from "@/lib/card-reservations-context";
import { CARD_RESERVATION_STATUS_BADGE_VARIANTS } from "@/lib/constants/card-reservations";
import type { GuestCardReservationListProps } from "@/lib/interfaces/card-reservations";
import { isActiveCardReservationStatus } from "@magic-vault/shared";
import { IconLoader2 } from "@tabler/icons-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export function GuestCardReservationList({ onOpenCard }: GuestCardReservationListProps) {
  const { t } = useTranslation("cards");
  const headingId = useId();
  const reservations = useCardReservationsContext();
  const statusText = useCardReservationStatusText();
  const mine = reservations?.mine ?? [];
  if (mine.length === 0) return null;

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-2 rounded-card bg-card p-4 md:p-2.5"
    >
      <div className="flex flex-col">
        <h3 id={headingId} className="font-heading text-sm font-semibold">
          {t("reservations.mineTitle")}
        </h3>
        <p className="text-xs text-foreground/70">{t("reservations.mineDescription")}</p>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {mine.map((reservation) => {
          const isActive = isActiveCardReservationStatus(reservation.status);
          const isCancelling = reservations?.cancellingReservationGuid === reservation.guid;
          return (
            <li key={reservation.guid} className="flex flex-col gap-2 py-2">
              <div className="flex items-start gap-2">
                <CardReservationCardSummary card={reservation.card} />
                <Badge
                  variant={
                    reservation.isReadyForPickup
                      ? "success"
                      : CARD_RESERVATION_STATUS_BADGE_VARIANTS[reservation.status]
                  }
                >
                  {reservation.isReadyForPickup
                    ? t("reservations.status.readyForPickup")
                    : t(`reservations.status.${reservation.status}`)}
                </Badge>
              </div>
              {isActive && <p className="text-xs text-foreground/70">{statusText(reservation)}</p>}
              {isActive && (
                <div className="flex flex-wrap gap-1.5">
                  {reservation.scanId && (
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={t("reservations.viewCardFor", { name: reservation.card.name })}
                      onClick={() => onOpenCard(reservation.scanId ?? "")}
                    >
                      {t("reservations.viewCard")}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isCancelling}
                    aria-label={t("reservations.cancelFor", { name: reservation.card.name })}
                    onClick={() => reservations?.cancelReservation(reservation)}
                  >
                    {isCancelling && <IconLoader2 className="animate-spin" />}
                    {t("reservations.cancel")}
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
