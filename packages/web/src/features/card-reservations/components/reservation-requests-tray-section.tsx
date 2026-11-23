import { Button } from "@/components/ui/button";
import { ALERT_SEVERITY_ICON_CLASS } from "@/lib/constants/colors";
import { reservationRequestsPath } from "@/lib/constants/business";
import type { ReservationRequestsTraySectionProps } from "@/lib/interfaces/card-reservations";
import { cn } from "@/lib/utils";
import { IconBookmark } from "@tabler/icons-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function ReservationRequestsTraySection({
  groups,
  onNavigate,
}: ReservationRequestsTraySectionProps) {
  const { t } = useTranslation("common");
  const headingId = useId();
  if (groups.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-0.5">
      <h3
        id={headingId}
        className="px-1 pt-1 text-xs font-medium tracking-wide text-foreground/70 uppercase"
      >
        {t("reservations.trayHeading")}
      </h3>
      {groups.map((group) => (
        <div key={group.requestGuid} className="flex items-start gap-2 rounded-md p-2 hover:bg-foreground/6">
          <IconBookmark
            className={cn("mt-0.5 size-3.5 shrink-0", ALERT_SEVERITY_ICON_CLASS.info)}
            aria-hidden
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-foreground">
              {t("reservations.trayToPull", { name: group.guestName, count: group.toPullCount })}
            </span>
            <div className="flex flex-wrap gap-1">
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link to={reservationRequestsPath([group.requestGuid])} />}
                onClick={onNavigate}
              >
                {t("reservations.trayReview")}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
