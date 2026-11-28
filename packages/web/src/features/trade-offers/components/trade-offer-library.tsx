import { CompactValue } from "@/components/compact-value";
import { Callout } from "@/components/callout";
import { EmptyState } from "@/components/empty-state";
import { StatGroupSkeleton } from "@/components/stat-group-skeleton";
import { TradeOfferDetailedRow } from "@/features/trade-offers/components/trade-offer-detailed-row";
import { TradeOfferListSkeleton } from "@/features/trade-offers/components/trade-offer-list-skeleton";
import { TradeOfferStats } from "@/features/trade-offers/components/trade-offer-stats";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTradeOffers } from "@/features/trade-offers/api/trade-offers";
import { tradeOfferSourceLabel } from "@/features/trade-offers/lib/trade-offer-source-label";
import { OutgoingTradeOfferList } from "@/features/trade-offers/components/outgoing-trade-offer-list";
import { MyCardReservationList } from "@/features/card-reservations/components/my-card-reservation-list";
import { StatusMessagesSwitch } from "@/features/status-messages/components/status-messages-switch";
import { GuestKindBadge } from "@/components/guest-kind-badge";
import {
  TRADE_OFFER_STATUS_BADGE_VARIANTS,
  tradeOfferPath,
} from "@/lib/constants/trade-offers";
import type {
  TradeOfferLibraryProps,
  TradeOfferLibraryRowProps,
  TradeOfferLibrarySectionProps,
} from "@/lib/interfaces/trade-offers";
import {
  formatCompactPriceInCurrency,
  formatPrice,
  isTradeOfferBeingPicked,
  PRICE_SOURCE_FIELDS,
  type TradeOffer,
} from "@magic-vault/shared";
import { IconArrowsExchange, IconChevronRight } from "@tabler/icons-react";
import { useId } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

function TradeOfferLibraryRow({ offer }: TradeOfferLibraryRowProps) {
  const { t, i18n } = useTranslation("common");
  const offeredCount = offer.offered.reduce((sum, card) => sum + card.quantity, 0);
  const date = new Date(offer.createdAt).toLocaleDateString(i18n.language, {
    dateStyle: "medium",
  });
  const remainingPickCount = isTradeOfferBeingPicked(offer) ? (offer.remainingPickScanIds?.length ?? 0) : 0;
  return (
    <li>
      <Link
        to={tradeOfferPath(offer.guid)}
        className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left transition-colors outline-none hover:bg-foreground/6 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:bg-foreground/6 motion-reduce:transition-none md:gap-2 md:px-2.5"
      >
        <IconArrowsExchange aria-hidden className="size-4 shrink-0 text-foreground/70" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-medium">
              {offer.guestName ||
                (offer.linkKind === "inPerson"
                  ? t("tradeOffers.inPerson.title")
                  : t("tradeOffers.library.unnamedGuest"))}
            </span>
            {offer.linkKind !== "inPerson" && <GuestKindBadge isFromAccount={offer.isFromAccount} />}
            {remainingPickCount > 0 ? (
              <Badge variant="info">
                {t("tradeOffers.library.picking", { count: remainingPickCount })}
              </Badge>
            ) : (
              offer.status !== "pending" && (
                <Badge variant={TRADE_OFFER_STATUS_BADGE_VARIANTS[offer.status]}>
                  {t(`tradeOffers.library.status.${offer.status}`)}
                </Badge>
              )
            )}
          </span>
          <span className="truncate text-xs text-foreground/70">
            {offer.linkKind === "inPerson"
              ? t("tradeOffers.inPerson.rowDetails", { given: offer.wanted.length, received: offeredCount })
              : t("tradeOffers.library.rowDetails", {
                  source: tradeOfferSourceLabel(offer, t),
                  wanted: offer.wanted.length,
                  offered: offeredCount,
                })}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="text-sm font-medium tabular-nums">
            <span className="sr-only">{t("tradeOffers.youGetValue")} </span>
            <CompactValue
              exact={formatPrice(offer.offeredValue, offer.priceSource)}
              compact={formatCompactPriceInCurrency(
                offer.offeredValue,
                PRICE_SOURCE_FIELDS[offer.priceSource].currency,
              )}
            />
          </span>
          <span className="text-xs text-foreground/70">{date}</span>
        </span>
        <IconChevronRight aria-hidden className="size-4 shrink-0 text-foreground/70" />
      </Link>
    </li>
  );
}

function TradeOfferLibrarySection({ title, offers }: TradeOfferLibrarySectionProps) {
  const headingId = useId();
  const isMobile = useIsMobile();
  if (offers.length === 0) return null;
  const Row = isMobile ? TradeOfferLibraryRow : TradeOfferDetailedRow;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2 md:gap-1.5">
      <h2 id={headingId} className="font-heading text-sm font-semibold">
        {title}
      </h2>
      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-card bg-card">
        {offers.map((offer) => (
          <Row key={offer.guid} offer={offer} />
        ))}
      </ul>
    </section>
  );
}

function ReceivedTradeOfferList() {
  const { t } = useTranslation("common");
  const isMobile = useIsMobile();
  const offers = useTradeOffers();
  const allOffers = offers.data ?? [];
  const newestFirst = [...allOffers].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const isOpen = (offer: TradeOffer) => offer.status === "pending" || isTradeOfferBeingPicked(offer);
  const openOffers = newestFirst.filter(isOpen);
  const answeredOffers = newestFirst.filter((offer) => !isOpen(offer));

  if (offers.isPending) {
    return (
      <>
        {!isMobile && <StatGroupSkeleton tiles={4} gridClassName="grid-cols-4" />}
        <TradeOfferListSkeleton hasHeading />
      </>
    );
  }

  if (offers.isError) {
    return (
      <Callout
        variant="error"
        action={
          <Button variant="outline" onClick={() => void offers.refetch()}>
            {t("a11y.retry")}
          </Button>
        }
      >
        {t("tradeOffers.library.loadFailed")}
      </Callout>
    );
  }

  return allOffers.length === 0 ? (
    <EmptyState
      icon={IconArrowsExchange}
      title={t("tradeOffers.library.emptyTitle")}
      description={t("tradeOffers.library.emptyDescription")}
    />
  ) : (
    <>
      {!isMobile && <TradeOfferStats offers={allOffers} />}
      <TradeOfferLibrarySection title={t("tradeOffers.library.open")} offers={openOffers} />
      <TradeOfferLibrarySection title={t("tradeOffers.library.answered")} offers={answeredOffers} />
    </>
  );
}

export function TradeOfferLibrary({ box }: TradeOfferLibraryProps) {
  if (box === "sent") {
    return (
      <>
        <StatusMessagesSwitch kind="tradeOffers" />
        <OutgoingTradeOfferList />
      </>
    );
  }
  if (box === "reservations") {
    return (
      <>
        <StatusMessagesSwitch kind="cardReservations" />
        <MyCardReservationList />
      </>
    );
  }
  return <ReceivedTradeOfferList />;
}
