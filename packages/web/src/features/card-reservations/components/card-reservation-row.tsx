import { MissingPrice } from "@/components/missing-price";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/features/business/lib/format";
import { CardReservationCardSummary } from "@/features/card-reservations/components/card-reservation-card-summary";
import { tradeOfferPlacementLines } from "@/features/trade-offers/lib/placement-lines";
import { CARD_RESERVATION_STAGE_BADGE_VARIANTS } from "@/lib/constants/card-reservations";
import type { CardReservationRowProps } from "@/lib/interfaces/card-reservations";
import { cn } from "@/lib/utils";
import {
  cardReservationStage,
  formatPrice,
  isActiveCardReservationStatus,
} from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function CardReservationRow({
  reservation,
  group,
  showsCardActions,
  canAct,
  busyKey,
  onCollect,
  onRelease,
}: CardReservationRowProps) {
  const { t } = useTranslation("business");
  const { t: tCommon } = useTranslation("common");
  const isActive = isActiveCardReservationStatus(reservation.status);
  const stage = cardReservationStage(reservation);
  const placementLines = isActive
    ? tradeOfferPlacementLines([reservation.placement], tCommon)
    : [];
  const timing =
    reservation.status === "ready"
      ? reservation.holdExpiresAt
        ? t("reservations.heldUntil", { date: formatDateTime(reservation.holdExpiresAt) })
        : null
      : reservation.status === "waiting"
        ? t("reservations.inLinePosition", {
            position: reservation.queuePosition ?? 0,
            total: reservation.queueLength,
          })
        : t("reservations.closedOn", { date: formatDateTime(reservation.closedAt) });
  const target = { kind: "reservation" as const, reservation, group };

  return (
    <li className="flex flex-col gap-1.5 py-2">
      <div className="flex items-start gap-2">
        <CardReservationCardSummary card={reservation.card} />
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={CARD_RESERVATION_STAGE_BADGE_VARIANTS[stage]}>
            {t(`reservations.stages.${stage}`)}
          </Badge>
          {isActive && (
            <span className="text-control font-medium tabular-nums">
              {reservation.price == null ? (
                <MissingPrice />
              ) : (
                formatPrice(reservation.price, reservation.priceSource)
              )}
            </span>
          )}
        </div>
      </div>
      {timing && <p className="text-xs text-foreground/70">{timing}</p>}
      {stage === "beingPicked" && reservation.pickOrderName && (
        <p className="text-xs text-foreground/70">
          {t("reservations.inPick", { name: reservation.pickOrderName })}
        </p>
      )}
      {placementLines.map((line) => (
        <p
          key={line.text}
          className={cn(
            "text-xs",
            line.isMissing ? "text-warning-foreground" : "text-foreground/70",
          )}
        >
          {line.text}
        </p>
      ))}
      {isActive && canAct && showsCardActions && (
        <div className="flex flex-wrap gap-1.5">
          {reservation.status === "ready" && (
            <Button
              variant="outline"
              disabled={busyKey !== null}
              aria-label={t("reservations.pickedUpCard", { card: reservation.card.name })}
              onClick={() => onCollect(target)}
            >
              {t("reservations.pickedUp")}
            </Button>
          )}
          <Button
            variant="ghost"
            disabled={busyKey !== null}
            aria-label={t("reservations.releaseCard", { card: reservation.card.name })}
            onClick={() => onRelease(target)}
          >
            {t("reservations.release")}
          </Button>
        </div>
      )}
    </li>
  );
}
