import { GuestKindBadge } from "@/components/guest-kind-badge";
import { Badge } from "@/components/ui/badge";
import { TradeOfferRowBalance } from "@/features/trade-offers/components/trade-offer-row-balance";
import { TradeOfferRowSide } from "@/features/trade-offers/components/trade-offer-row-side";
import {
  isUnpricedTradeSide,
  offeredCardCount,
  offeredStackCards,
  wantedStackCards,
} from "@/features/trade-offers/lib/trade-offer-row-cards";
import { tradeOfferSourceLabel } from "@/features/trade-offers/lib/trade-offer-source-label";
import {
  TRADE_OFFER_ROW_GRID_CLASS,
  TRADE_OFFER_STATUS_BADGE_VARIANTS,
  tradeOfferPath,
} from "@/lib/constants/trade-offers";
import type { TradeOfferLibraryRowProps } from "@/lib/interfaces/trade-offers";
import { cn } from "@/lib/utils";
import {
  formatPrice,
  formatTradeOfferCash,
  isTradeOfferBeingPicked,
  MISSING_PRICE_TEXT,
  tradeOfferOfferedCash,
} from "@magic-vault/shared";
import { IconChevronRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function TradeOfferDetailedRow({ offer }: TradeOfferLibraryRowProps) {
  const { t, i18n } = useTranslation("common");
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, { dateStyle: "medium" });
  const isInPerson = offer.linkKind === "inPerson";
  const remainingPickCount = isTradeOfferBeingPicked(offer)
    ? (offer.remainingPickScanIds?.length ?? 0)
    : 0;
  const sideValue = (prices: (number | null)[], value: number) =>
    isUnpricedTradeSide(prices, value) ? MISSING_PRICE_TEXT : formatPrice(value, offer.priceSource);
  const offeredCash = tradeOfferOfferedCash(offer);
  return (
    <li>
      <Link
        to={tradeOfferPath(offer.guid)}
        className={cn(
          TRADE_OFFER_ROW_GRID_CLASS,
          "w-full px-3 py-2.5 text-left transition-colors outline-none hover:bg-foreground/6 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:bg-foreground/6 motion-reduce:transition-none",
        )}
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-medium">
              {offer.guestName ||
                (isInPerson
                  ? t("tradeOffers.inPerson.title")
                  : t("tradeOffers.library.unnamedGuest"))}
            </span>
            {!isInPerson && <GuestKindBadge isFromAccount={offer.isFromAccount} />}
            {remainingPickCount > 0 ? (
              <Badge variant="info">
                {t("tradeOffers.library.picking", { count: remainingPickCount })}
              </Badge>
            ) : (
              <Badge variant={TRADE_OFFER_STATUS_BADGE_VARIANTS[offer.status]}>
                {t(`tradeOffers.library.status.${offer.status}`)}
              </Badge>
            )}
          </span>
          <span className="truncate text-xs text-foreground/70">
            {tradeOfferSourceLabel(offer, t)}
          </span>
          {offer.guestNote && (
            <span className="truncate text-xs text-foreground/70">
              {t("tradeOffers.library.note", { note: offer.guestNote })}
            </span>
          )}
        </span>
        <TradeOfferRowSide
          label={t("tradeOffers.theyGetValue")}
          cards={wantedStackCards(offer.wanted)}
          cardCount={offer.wanted.length}
          value={sideValue(offer.wantedPrices, offer.wantedValue)}
          cash={offer.givenCash ? formatTradeOfferCash(offer.givenCash) : null}
        />
        <TradeOfferRowSide
          label={t("tradeOffers.youGetValue")}
          cards={offeredStackCards(offer.offered)}
          cardCount={offeredCardCount(offer.offered)}
          value={sideValue(offer.offeredPrices, offer.offeredValue)}
          cash={offeredCash ? formatTradeOfferCash(offeredCash) : null}
        />
        <span className="flex items-center gap-2">
          <span className="flex min-w-0 flex-1 flex-col items-end gap-0.5">
            <TradeOfferRowBalance offer={offer} />
            <span className="text-xs text-foreground/70">
              {t("tradeOffers.library.receivedOn", { date: formatDate(offer.createdAt) })}
            </span>
            {offer.respondedAt && (
              <span className="text-xs text-foreground/70">
                {t("tradeOffers.library.answeredOn", { date: formatDate(offer.respondedAt) })}
              </span>
            )}
          </span>
          <IconChevronRight aria-hidden className="size-4 shrink-0 text-foreground/70" />
        </span>
      </Link>
    </li>
  );
}
