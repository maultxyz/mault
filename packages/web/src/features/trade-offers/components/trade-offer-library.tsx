import { CompactValue } from "@/components/compact-value";
import { Callout } from "@/components/callout";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { ResponsiveSegmented } from "@/components/responsive-segmented";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTradeOffers } from "@/features/trade-offers/api/trade-offers";
import { tradeOfferSourceLabel } from "@/features/trade-offers/lib/trade-offer-source-label";
import { OutgoingTradeOfferList } from "@/features/trade-offers/components/outgoing-trade-offer-list";
import {
  TRADE_OFFER_STATUS_BADGE_VARIANTS,
  TRADE_OFFERS_SKELETON_ROWS,
  TRADES_BOX_PARAM,
  TRADES_BOXES,
  tradeOfferPath,
} from "@/lib/constants/trade-offers";
import type {
  TradeOfferLibraryRowProps,
  TradeOfferLibrarySectionProps,
  TradesBox,
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
import { Link, useSearchParams } from "react-router-dom";
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
  if (offers.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2 md:gap-1.5">
      <h2 id={headingId} className="font-heading text-sm font-semibold">
        {title}
      </h2>
      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-card bg-card">
        {offers.map((offer) => (
          <TradeOfferLibraryRow key={offer.guid} offer={offer} />
        ))}
      </ul>
    </section>
  );
}

function ReceivedTradeOfferList() {
  const { t } = useTranslation("common");
  const offers = useTradeOffers();
  const allOffers = offers.data ?? [];
  const newestFirst = [...allOffers].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const isOpen = (offer: TradeOffer) => offer.status === "pending" || isTradeOfferBeingPicked(offer);
  const openOffers = newestFirst.filter(isOpen);
  const answeredOffers = newestFirst.filter((offer) => !isOpen(offer));

  if (offers.isPending) {
    return <ListSkeleton rows={TRADE_OFFERS_SKELETON_ROWS} />;
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
      <TradeOfferLibrarySection title={t("tradeOffers.library.open")} offers={openOffers} />
      <TradeOfferLibrarySection title={t("tradeOffers.library.answered")} offers={answeredOffers} />
    </>
  );
}

export function TradeOfferLibrary() {
  const { t } = useTranslation("common");
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedBox = searchParams.get(TRADES_BOX_PARAM);
  const box: TradesBox = (TRADES_BOXES as readonly string[]).includes(requestedBox ?? "")
    ? (requestedBox as TradesBox)
    : "received";
  const changeBox = (next: TradesBox) =>
    setSearchParams(
      (previous) => {
        const updated = new URLSearchParams(previous);
        if (next === "received") updated.delete(TRADES_BOX_PARAM);
        else updated.set(TRADES_BOX_PARAM, next);
        return updated;
      },
      { replace: true },
    );

  return (
    <>
      <ResponsiveSegmented
        items={TRADES_BOXES.map((key) => ({ key, label: t(`tradeOffers.boxes.${key}`) }))}
        value={box}
        onChange={changeBox}
        label={t("tradeOffers.boxes.label")}
        className="self-start"
      />
      {box === "sent" ? <OutgoingTradeOfferList /> : <ReceivedTradeOfferList />}
    </>
  );
}
