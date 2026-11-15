import { Callout } from "@/components/callout";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOutgoingTradeOffers } from "@/features/trade-offers/api/use-outgoing-trade-offers";
import {
  TRADE_OFFER_STATUS_BADGE_VARIANTS,
  TRADE_OFFERS_SKELETON_ROWS,
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

export function OutgoingTradeOfferList() {
  const { t } = useTranslation("common");
  const offers = useOutgoingTradeOffers();

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
    <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-card bg-card">
      {offers.data.map((offer) => (
        <OutgoingTradeOfferRow key={offer.guid} offer={offer} />
      ))}
    </ul>
  );
}
