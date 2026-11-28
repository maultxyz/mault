import { Callout } from "@/components/callout";
import { EmptyState } from "@/components/empty-state";
import { StatGroupSkeleton } from "@/components/stat-group-skeleton";
import { TradeOfferListSkeleton } from "@/features/trade-offers/components/trade-offer-list-skeleton";
import { TradeOfferRowSide } from "@/features/trade-offers/components/trade-offer-row-side";
import { OutgoingTradeOfferStats } from "@/features/trade-offers/components/trade-offer-stats";
import {
  offeredCardCount,
  offeredStackCards,
  wantedStackCards,
} from "@/features/trade-offers/lib/trade-offer-row-cards";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { cn } from "@/lib/utils";
import { formatTradeOfferCash, tradeOfferOfferedCash } from "@magic-vault/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOutgoingTradeOffers } from "@/features/trade-offers/api/use-outgoing-trade-offers";
import {
  TRADE_OFFER_ROW_GRID_CLASS,
  TRADE_OFFER_STATUS_BADGE_VARIANTS,
  sentTradeOfferPath,
} from "@/lib/constants/trade-offers";
import type { OutgoingTradeOfferRowProps } from "@/lib/interfaces/trade-offers";
import { IconChevronRight, IconSend } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

function OutgoingTradeOfferRow({ offer }: OutgoingTradeOfferRowProps) {
  const { t, i18n } = useTranslation("common");
  const offeredCount = offer.offered.reduce((sum, card) => sum + card.quantity, 0);
  const date = new Date(offer.createdAt).toLocaleDateString(i18n.language, {
    dateStyle: "medium",
  });
  return (
    <li>
      <Link
        to={sentTradeOfferPath(offer.guid)}
        className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left transition-colors outline-none hover:bg-foreground/6 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:bg-foreground/6 motion-reduce:transition-none md:gap-2 md:px-2.5"
      >
        <IconSend aria-hidden className="size-4 shrink-0 text-foreground/70" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-medium">
              {offer.sentToName ?? t("tradeOffers.sent.unknownRecipient")}
            </span>
            <Badge variant={TRADE_OFFER_STATUS_BADGE_VARIANTS[offer.status]}>
              {t(`tradeOffers.sent.status.${offer.status}`)}
            </Badge>
          </span>
          <span className="truncate text-xs text-foreground/70">
            {t("tradeOffers.sent.rowDetails", {
              wanted: offer.wanted.length,
              offered: offeredCount,
            })}
          </span>
        </span>
        <span className="shrink-0 text-xs text-foreground/70">{date}</span>
        <IconChevronRight aria-hidden className="size-4 shrink-0 text-foreground/70" />
      </Link>
    </li>
  );
}

function OutgoingTradeOfferDetailedRow({ offer }: OutgoingTradeOfferRowProps) {
  const { t, i18n } = useTranslation("common");
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, { dateStyle: "medium" });
  const offeredCash = tradeOfferOfferedCash(offer);
  return (
    <li>
      <Link
        to={sentTradeOfferPath(offer.guid)}
        className={cn(
          TRADE_OFFER_ROW_GRID_CLASS,
          "w-full px-3 py-2.5 text-left transition-colors outline-none hover:bg-foreground/6 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:bg-foreground/6 motion-reduce:transition-none",
        )}
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-medium">
              {offer.sentToName ?? t("tradeOffers.sent.unknownRecipient")}
            </span>
            <Badge variant={TRADE_OFFER_STATUS_BADGE_VARIANTS[offer.status]}>
              {t(`tradeOffers.sent.status.${offer.status}`)}
            </Badge>
          </span>
          {offer.guestNote && (
            <span className="truncate text-xs text-foreground/70">
              {t("tradeOffers.library.note", { note: offer.guestNote })}
            </span>
          )}
        </span>
        <TradeOfferRowSide
          label={t("tradeOffers.theyGetValue")}
          cards={offeredStackCards(offer.offered)}
          cardCount={offeredCardCount(offer.offered)}
          cash={offeredCash ? formatTradeOfferCash(offeredCash) : null}
        />
        <TradeOfferRowSide
          label={t("tradeOffers.youGetValue")}
          cards={wantedStackCards(offer.wanted)}
          cardCount={offer.wanted.length}
        />
        <span className="flex items-center gap-2">
          <span className="flex min-w-0 flex-1 flex-col items-end gap-0.5 text-xs text-foreground/70">
            <span>{t("tradeOffers.sent.detailDescription", { date: formatDate(offer.createdAt) })}</span>
            {offer.respondedAt && (
              <span>{t("tradeOffers.sent.answeredOn", { date: formatDate(offer.respondedAt) })}</span>
            )}
          </span>
          <IconChevronRight aria-hidden className="size-4 shrink-0 text-foreground/70" />
        </span>
      </Link>
    </li>
  );
}

export function OutgoingTradeOfferList() {
  const { t } = useTranslation("common");
  const offers = useOutgoingTradeOffers();
  const isMobile = useIsMobile();
  const Row = isMobile ? OutgoingTradeOfferRow : OutgoingTradeOfferDetailedRow;

  if (offers.isPending) {
    return (
      <>
        {!isMobile && <StatGroupSkeleton tiles={3} gridClassName="grid-cols-3" />}
        <TradeOfferListSkeleton />
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
        {t("tradeOffers.sent.loadFailed")}
      </Callout>
    );
  }

  return offers.data.length === 0 ? (
    <EmptyState
      icon={IconSend}
      title={t("tradeOffers.sent.emptyTitle")}
      description={t("tradeOffers.sent.emptyDescription")}
    />
  ) : (
    <>
      {!isMobile && <OutgoingTradeOfferStats offers={offers.data} />}
      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-card bg-card">
        {offers.data.map((offer) => (
          <Row key={offer.guid} offer={offer} />
        ))}
      </ul>
    </>
  );
}
