import { MobilePageHeader } from "@/components/mobile-page-header";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { ViewTabs } from "@/components/view-tabs";
import { TradeOfferOfferedCash } from "@/features/trade-offers/components/trade-offer-offered-cash";
import { TradeOfferReviewSide } from "@/features/trade-offers/components/trade-offer-review-side";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MOBILE_PAGE_BODY_CLASS } from "@/lib/constants/nav";
import {
  SENT_TRADES_PATH,
  TRADE_OFFER_STATUS_BADGE_VARIANTS,
} from "@/lib/constants/trade-offers";
import type {
  OutgoingTradeOfferDetailProps,
  TradeOfferSide,
} from "@/lib/interfaces/trade-offers";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PRICE_SOURCE,
  TRADE_OFFER_YOU_OFFERED_TITLE_KEYS,
  tradeOfferOfferKind,
  tradeOfferOfferedCardCount,
} from "@magic-vault/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export function OutgoingTradeOfferDetail({ offer }: OutgoingTradeOfferDetailProps) {
  const { t, i18n } = useTranslation("common");
  const isMobile = useIsMobile();
  const [visibleSide, setVisibleSide] = useState<TradeOfferSide>("wanted");
  const offeredCount = tradeOfferOfferedCardCount(offer);
  const wantedPrices = useMemo(() => offer.wanted.map(() => null), [offer.wanted]);
  const offeredPrices = useMemo(() => offer.offered.map(() => null), [offer.offered]);
  const formatDate = (value: string) =>
    new Date(value).toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" });
  const title = t("tradeOffers.sent.detailTitle", {
    name: offer.sentToName ?? t("tradeOffers.sent.unknownRecipient"),
  });
  const description = t("tradeOffers.sent.detailDescription", { date: formatDate(offer.createdAt) });

  const sideClassName = (side: TradeOfferSide) =>
    cn("rounded-card bg-card p-3 md:p-2.5", visibleSide !== side && "max-md:hidden");

  const body = (
    <>
      <div className="flex flex-col gap-2 rounded-card bg-card p-3 md:p-2.5">
        <p className="flex flex-wrap items-center gap-1.5 text-control">
          <Badge variant={TRADE_OFFER_STATUS_BADGE_VARIANTS[offer.status]}>
            {t(`tradeOffers.sent.status.${offer.status}`)}
          </Badge>
          {offer.respondedAt
            ? t("tradeOffers.sent.answeredOn", { date: formatDate(offer.respondedAt) })
            : t("tradeOffers.sent.waitingHint")}
        </p>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-control">
          <dt className="text-foreground/70">{t("tradeOffers.sent.yourName")}</dt>
          <dd className="break-words">{offer.guestName}</dd>
          <dt className="text-foreground/70">{t("tradeOffers.contact")}</dt>
          <dd className="break-words">{offer.guestContact}</dd>
          {offer.guestNote && (
            <>
              <dt className="text-foreground/70">{t("tradeOffers.note")}</dt>
              <dd className="break-words whitespace-pre-line">{offer.guestNote}</dd>
            </>
          )}
        </dl>
      </div>
      <ViewTabs
        items={[
          { key: "wanted", label: t("tradeOffers.sent.sideTabs.wanted", { count: offer.wanted.length }) },
          { key: "offered", label: t("tradeOffers.sent.sideTabs.offered", { count: offeredCount }) },
        ]}
        value={visibleSide}
        onChange={setVisibleSide}
        label={t("tradeOffers.sideTabs.label")}
        fill={isMobile}
        className="md:hidden"
      />
      <div className="grid items-start gap-3 md:grid-cols-2 md:gap-2">
        <TradeOfferReviewSide
          title={t("tradeOffers.sent.youWant", { count: offer.wanted.length })}
          cards={offer.wanted}
          prices={wantedPrices}
          priceSource={DEFAULT_PRICE_SOURCE}
          showsPrices={false}
          className={sideClassName("wanted")}
        />
        <TradeOfferReviewSide
          title={t(TRADE_OFFER_YOU_OFFERED_TITLE_KEYS[tradeOfferOfferKind(offer)], { count: offeredCount })}
          cards={offer.offered}
          prices={offeredPrices}
          priceSource={DEFAULT_PRICE_SOURCE}
          showsPrices={false}
          className={sideClassName("offered")}
        >
          <TradeOfferOfferedCash offer={offer} />
        </TradeOfferReviewSide>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <MobilePageHeader title={title} subtitle={description} backTo={SENT_TRADES_PATH} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className={MOBILE_PAGE_BODY_CLASS}>{body}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <PageHeader
        title={title}
        description={description}
        backTo={SENT_TRADES_PATH}
        backLabel={t("tradeOffers.sent.backToSent")}
      />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:gap-2 md:px-3 md:py-2">
        {body}
      </div>
    </div>
  );
}
