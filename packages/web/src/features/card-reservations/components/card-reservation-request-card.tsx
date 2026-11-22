import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/features/business/lib/format";
import { CardReservationRow } from "@/features/card-reservations/components/card-reservation-row";
import { cardReservationBusyKey } from "@/features/card-reservations/lib/card-reservation-busy-key";
import { useCardReservationGroupSummary } from "@/features/card-reservations/lib/use-card-reservation-group-summary";
import { picksPath } from "@/lib/constants/business";
import type { CardReservationRequestCardProps } from "@/lib/interfaces/card-reservations";
import { formatPrice } from "@magic-vault/shared";
import { IconLoader2, IconTruckDelivery } from "@tabler/icons-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function CardReservationRequestCard({
  group,
  canAct,
  busyKey,
  onCollect,
  onRelease,
  onCreatePick,
}: CardReservationRequestCardProps) {
  const { t } = useTranslation("business");
  const headingId = useId();
  const summary = useCardReservationGroupSummary();
  const activeCount = group.heldCount + group.waitingCount;
  const target = { kind: "request" as const, group };
  const isBusy = busyKey === cardReservationBusyKey(target);
  const isCreatingPick = busyKey === cardReservationBusyKey(target, "pick");
  const priceSource = group.reservations[0]?.priceSource;

  return (
    <article
      aria-labelledby={headingId}
      className="flex flex-col gap-2 rounded-card bg-card p-3 md:p-2.5"
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 flex-col">
          <h3 id={headingId} className="text-sm font-semibold break-words">
            {group.guestName}
          </h3>
          <p className="text-xs break-words text-foreground/70">{group.guestContact}</p>
        </div>
        <dl className="flex shrink-0 flex-col items-end text-xs text-foreground/70">
          <div className="flex gap-1">
            <dt>{t("reservations.reservedOn")}</dt>
            <dd>{formatDateTime(group.createdAt)}</dd>
          </div>
          {group.catalogName && (
            <div className="flex gap-1">
              <dt>{t("reservations.catalog")}</dt>
              <dd className="break-words">{group.catalogName}</dd>
            </div>
          )}
        </dl>
      </header>
      {group.guestNote && (
        <p className="rounded-lg bg-foreground/6 p-2 text-xs whitespace-pre-line">
          {group.guestNote}
        </p>
      )}
      {group.pickOrders.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {group.pickOrders.map((order) => (
            <Button
              key={order.guid}
              variant="outline"
              nativeButton={false}
              render={<Link to={picksPath(order.guid)} />}
            >
              <IconTruckDelivery />
              {t("reservations.openPick", { name: order.name })}
            </Button>
          ))}
        </div>
      )}
      <ul className="flex flex-col divide-y divide-border">
        {group.reservations.map((reservation) => (
          <CardReservationRow
            key={reservation.guid}
            reservation={reservation}
            group={group}
            showsCardActions={activeCount > 1}
            canAct={canAct}
            busyKey={busyKey}
            onCollect={onCollect}
            onRelease={onRelease}
            onCreatePick={onCreatePick}
          />
        ))}
      </ul>
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
          <div className="flex flex-col text-xs">
            <span>{summary(group)}</span>
            {group.heldCount > 0 && priceSource && (
              <span className="text-foreground/70">
                {t(
                  group.hasMissingHeldPrices
                    ? "reservations.heldTotalMissingPrices"
                    : "reservations.heldTotal",
                  { total: formatPrice(group.heldPriceTotal, priceSource) },
                )}
              </span>
            )}
          </div>
          {canAct && (
            <div data-tour="reservations-actions" className="flex flex-wrap gap-1.5">
              {group.toPullCount > 0 && (
                <Button
                  data-tour="reservations-create-pick"
                  variant={group.readyForPickupCount > 0 ? "outline" : "default"}
                  disabled={busyKey !== null}
                  aria-label={t("reservations.createPickFor", {
                    count: group.toPullCount,
                    name: group.guestName,
                  })}
                  onClick={() => onCreatePick(group)}
                >
                  {isCreatingPick ? <IconLoader2 className="animate-spin" /> : <IconTruckDelivery />}
                  {t("reservations.createPick", { count: group.toPullCount })}
                </Button>
              )}
              {group.heldCount > 0 && (
                <Button
                  variant={group.readyForPickupCount > 0 ? "default" : "outline"}
                  disabled={busyKey !== null}
                  aria-label={t("reservations.pickedUpGroupFor", {
                    count: group.heldCount,
                    name: group.guestName,
                  })}
                  onClick={() => onCollect(target)}
                >
                  {isBusy && <IconLoader2 className="animate-spin" />}
                  {t("reservations.pickedUpGroup", { count: group.heldCount })}
                </Button>
              )}
              <Button
                variant="outline"
                disabled={busyKey !== null}
                aria-label={t("reservations.releaseGroupFor", {
                  count: activeCount,
                  name: group.guestName,
                })}
                onClick={() => onRelease(target)}
              >
                {t("reservations.releaseGroup", { count: activeCount })}
              </Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
