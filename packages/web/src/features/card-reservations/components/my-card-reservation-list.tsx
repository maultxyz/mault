import { Callout } from "@/components/callout";
import { EmptyState } from "@/components/empty-state";
import { CardReservationRequestSkeleton } from "@/features/card-reservations/components/card-reservation-request-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useMyCardReservationActions,
  useMyCardReservations,
} from "@/features/card-reservations/api/use-my-card-reservations";
import { CardReservationCardSummary } from "@/features/card-reservations/components/card-reservation-card-summary";
import { GuestReservationRequestHeader } from "@/features/card-reservations/components/guest-reservation-request-header";
import { useCardReservationStatusText } from "@/features/card-reservations/lib/use-card-reservation-status-text";
import {
  CARD_RESERVATION_STATUS_BADGE_VARIANTS,
  myCardReservationRequestElementId,
} from "@/lib/constants/card-reservations";
import type {
  MyCardReservationRowProps,
  MyCardReservationSectionProps,
} from "@/lib/interfaces/card-reservations";
import {
  MY_CARD_RESERVATION_REQUEST_PARAM,
  groupReservationsByRequestGuid,
  isActiveCardReservationStatus,
} from "@magic-vault/shared";
import { IconBookmark, IconExternalLink, IconLoader2 } from "@tabler/icons-react";
import { useEffect, useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

function MyCardReservationRow({ reservation, isNew, isCancelling, onCancel }: MyCardReservationRowProps) {
  const { t } = useTranslation("common");
  const { t: tCards } = useTranslation("cards");
  const statusText = useCardReservationStatusText();
  const isActive = isActiveCardReservationStatus(reservation.status);
  return (
    <li className="flex flex-col gap-1.5 py-2">
      <div className="flex items-start gap-2">
        <CardReservationCardSummary card={reservation.card} />
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge
            variant={
              reservation.isReadyForPickup
                ? "success"
                : CARD_RESERVATION_STATUS_BADGE_VARIANTS[reservation.status]
            }
          >
            {reservation.isReadyForPickup
              ? tCards("reservations.status.readyForPickup")
              : tCards(`reservations.status.${reservation.status}`)}
          </Badge>
          {isNew && <Badge variant="default">{t("myReservations.new")}</Badge>}
        </div>
      </div>
      {isActive && <p className="text-xs text-foreground/70">{statusText(reservation)}</p>}
      {isActive && (
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant="ghost"
            disabled={isCancelling}
            aria-label={tCards("reservations.cancelFor", { name: reservation.card.name })}
            onClick={() => onCancel({ kind: "reservation", reservationGuid: reservation.guid })}
          >
            {isCancelling && <IconLoader2 className="animate-spin" />}
            {tCards("reservations.cancel")}
          </Button>
        </div>
      )}
    </li>
  );
}

function MyCardReservationSection({
  title,
  groups,
  newGuids,
  isCancelling,
  onCancel,
}: MyCardReservationSectionProps) {
  const { t } = useTranslation("common");
  const headingId = useId();
  if (groups.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2 md:gap-1.5">
      <h2 id={headingId} className="font-heading text-sm font-semibold">
        {title}
      </h2>
      {groups.map((group) => {
        const first = group.reservations[0];
        const requestTarget = { kind: "request" as const, requestGuid: group.requestGuid };
        return (
          <article
            key={group.requestGuid}
            id={myCardReservationRequestElementId(group.requestGuid)}
            tabIndex={-1}
            className="flex scroll-mt-4 flex-col gap-2 rounded-card bg-card p-3 outline-none focus-visible:ring-2 focus-visible:ring-primary md:p-2.5"
          >
            <GuestReservationRequestHeader
              reservations={group.reservations}
              title={first?.catalogName ?? t("myReservations.unknownCatalog")}
              isCancellingAll={isCancelling(requestTarget)}
              onCancelAll={() => onCancel(requestTarget)}
              actions={
                first?.catalogUrl && (
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<a href={first.catalogUrl} target="_blank" rel="noopener noreferrer" />}
                  >
                    <IconExternalLink />
                    {t("myReservations.openCatalog")}
                    <span className="sr-only">{t("publicNav.opensInNewTab")}</span>
                  </Button>
                )
              }
            />
            <ul className="flex flex-col divide-y divide-border">
              {group.reservations.map((reservation) => (
                <MyCardReservationRow
                  key={reservation.guid}
                  reservation={reservation}
                  isNew={newGuids.has(reservation.guid)}
                  isCancelling={isCancelling({ kind: "reservation", reservationGuid: reservation.guid })}
                  onCancel={onCancel}
                />
              ))}
            </ul>
          </article>
        );
      })}
    </section>
  );
}

export function MyCardReservationList() {
  const { t } = useTranslation("common");
  const reservations = useMyCardReservations();
  const { cancel, markSeen, isCancelling } = useMyCardReservationActions();
  const newGuidsRef = useRef(new Set<string>());
  const alertedGuids = (reservations.data ?? [])
    .filter((reservation) => reservation.guestAlert !== null)
    .map((reservation) => reservation.guid);
  for (const guid of alertedGuids) newGuidsRef.current.add(guid);
  const alertedKey = alertedGuids.join(",");
  const markAlertsSeen = markSeen.mutate;

  useEffect(() => {
    if (alertedKey) markAlertsSeen(alertedKey.split(","));
  }, [alertedKey, markAlertsSeen]);

  const [searchParams, setSearchParams] = useSearchParams();
  const linkedRequestGuid = searchParams.get(MY_CARD_RESERVATION_REQUEST_PARAM);
  const hasLoaded = reservations.isSuccess;
  useEffect(() => {
    if (!linkedRequestGuid || !hasLoaded) return;
    const linkedRequest = document.getElementById(
      myCardReservationRequestElementId(linkedRequestGuid),
    );
    if (linkedRequest) {
      linkedRequest.scrollIntoView({ block: "start" });
      linkedRequest.focus({ preventScroll: true });
    }
    setSearchParams(
      (previous) => {
        const updated = new URLSearchParams(previous);
        updated.delete(MY_CARD_RESERVATION_REQUEST_PARAM);
        return updated;
      },
      { replace: true },
    );
  }, [linkedRequestGuid, hasLoaded, setSearchParams]);

  if (reservations.isPending) {
    return <CardReservationRequestSkeleton />;
  }

  if (reservations.isError) {
    return (
      <Callout
        variant="error"
        action={
          <Button variant="outline" onClick={() => void reservations.refetch()}>
            {t("a11y.retry")}
          </Button>
        }
      >
        {t("myReservations.loadFailed")}
      </Callout>
    );
  }

  const groups = groupReservationsByRequestGuid(reservations.data);
  const isOpen = (group: (typeof groups)[number]) =>
    group.reservations.some((reservation) => isActiveCardReservationStatus(reservation.status));
  const sectionProps = {
    newGuids: newGuidsRef.current,
    isCancelling,
    onCancel: cancel.mutate,
  };

  return groups.length === 0 ? (
    <EmptyState
      icon={IconBookmark}
      title={t("myReservations.emptyTitle")}
      description={t("myReservations.emptyDescription")}
    />
  ) : (
    <>
      <MyCardReservationSection
        title={t("myReservations.open")}
        groups={groups.filter(isOpen)}
        {...sectionProps}
      />
      <MyCardReservationSection
        title={t("myReservations.past")}
        groups={groups.filter((group) => !isOpen(group))}
        {...sectionProps}
      />
    </>
  );
}
