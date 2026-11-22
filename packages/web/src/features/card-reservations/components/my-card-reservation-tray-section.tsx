import { Button } from "@/components/ui/button";
import { useMyCardReservationActions } from "@/features/card-reservations/api/use-my-card-reservations";
import { ALERT_SEVERITY_ICON_CLASS } from "@/lib/constants/colors";
import { MY_RESERVATIONS_PATH } from "@/lib/constants/trade-offers";
import type { MyCardReservationTraySectionProps } from "@/lib/interfaces/card-reservations";
import { cn } from "@/lib/utils";
import { IconBookmark } from "@tabler/icons-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function MyCardReservationTraySection({
  alerts,
  onNavigate,
}: MyCardReservationTraySectionProps) {
  const { t } = useTranslation("common");
  const headingId = useId();
  const { markSeen } = useMyCardReservationActions();
  if (alerts.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-0.5">
      <h3
        id={headingId}
        className="px-1 pt-1 text-xs font-medium tracking-wide text-foreground/70 uppercase"
      >
        {t("myReservations.trayHeading")}
      </h3>
      {alerts.map((reservation) => (
        <div key={reservation.guid} className="flex items-start gap-2 rounded-md p-2 hover:bg-foreground/6">
          <IconBookmark
            className={cn("mt-0.5 size-3.5 shrink-0", ALERT_SEVERITY_ICON_CLASS.info)}
            aria-hidden
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-foreground">
              {t(`myReservations.alerts.${reservation.guestAlert}`, {
                card: reservation.card.name,
                catalog: reservation.catalogName ?? t("myReservations.unknownCatalog"),
              })}
            </span>
            <div className="flex flex-wrap gap-1">
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link to={MY_RESERVATIONS_PATH} />}
                onClick={onNavigate}
              >
                {t("myReservations.view")}
              </Button>
              <Button
                variant="ghost"
                disabled={markSeen.isPending}
                aria-label={t("myReservations.dismissFor", { card: reservation.card.name })}
                onClick={() => markSeen.mutate([reservation.guid])}
              >
                {t("myReservations.dismiss")}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
