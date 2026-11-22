import { Button } from "@/components/ui/button";
import type { GuestReservationRequestHeaderProps } from "@/lib/interfaces/card-reservations";
import { guestCardReservationCounts, isActiveCardReservationStatus } from "@magic-vault/shared";
import { IconLoader2 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function GuestReservationRequestHeader({
  reservations,
  title,
  headingLevel: Heading = "h3",
  isCancellingAll,
  onCancelAll,
  actions,
}: GuestReservationRequestHeaderProps) {
  const { t, i18n } = useTranslation("cards");
  const activeCount = reservations.filter((reservation) =>
    isActiveCardReservationStatus(reservation.status),
  ).length;
  const counts = guestCardReservationCounts(reservations);
  const stages = (
    [
      ["readyForPickup", counts.readyForPickup],
      ["held", counts.held],
      ["waiting", counts.waiting],
    ] as const
  )
    .filter(([, count]) => count > 0)
    .map(([stage, count]) => t(`reservations.requestCounts.${stage}`, { count }))
    .join(", ");
  const cards = t("reservations.requestCardCount", { count: reservations.length });
  const reservedOn = new Date(reservations[0]?.createdAt ?? Date.now()).toLocaleDateString(
    i18n.language,
    { dateStyle: "medium" },
  );

  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="flex min-w-0 flex-col">
        <Heading className="text-sm font-semibold break-words">{title}</Heading>
        <p className="text-xs text-foreground/70">
          {[t("reservations.requestReservedOn", { date: reservedOn }), stages ? t("reservations.requestSummary", { cards, stages }) : cards].join(" · ")}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {actions}
        {activeCount > 1 && (
          <Button
            type="button"
            variant="outline"
            disabled={isCancellingAll}
            aria-label={t("reservations.cancelAllFor", { count: activeCount, name: title })}
            onClick={onCancelAll}
          >
            {isCancellingAll && <IconLoader2 className="animate-spin" />}
            {t("reservations.cancelAll", { count: activeCount })}
          </Button>
        )}
      </div>
    </div>
  );
}
