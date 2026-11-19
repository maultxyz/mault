import {
  DEFAULT_PRICE_SOURCE,
  TRADE_OFFER_YOU_OFFERED_TITLE_KEYS,
  tradeOfferOfferKind,
  tradeOfferOfferedCardCount,
} from "@magic-vault/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useWindowDimensions, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Pill } from "@/components/ui/pill";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";
import { TabStrip } from "@/components/ui/tab-strip";
import { TradeOfferOfferedCash } from "@/features/trade-offers/components/trade-offer-offered-cash";
import { TradeOfferReviewSide } from "@/features/trade-offers/components/trade-offer-review-side";
import { SPACING } from "@/lib/constants/theme";
import {
  TRADE_OFFER_STATUS_TONES,
  TRADE_OFFER_TWO_COLUMN_MIN_WINDOW_WIDTH,
} from "@/lib/constants/trade-offers";
import type { OutgoingTradeOfferReviewProps, TradeOfferSide } from "@/lib/interfaces/trade-offers";

export function OutgoingTradeOfferReview({ offer }: OutgoingTradeOfferReviewProps) {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const showsTwoColumns = width >= TRADE_OFFER_TWO_COLUMN_MIN_WINDOW_WIDTH;
  const [visibleSide, setVisibleSide] = useState<TradeOfferSide>("wanted");
  const offeredCount = tradeOfferOfferedCardCount(offer);
  const wantedPrices = useMemo(() => offer.wanted.map(() => null), [offer.wanted]);
  const offeredPrices = useMemo(() => offer.offered.map(() => null), [offer.offered]);
  const formatDate = (value: string) => new Date(value).toLocaleString(i18n.language);

  const wantedSide = (
    <TradeOfferReviewSide
      title={t("tradeOffers.sent.youWant", { count: offer.wanted.length })}
      cards={offer.wanted}
      prices={wantedPrices}
      priceSource={DEFAULT_PRICE_SOURCE}
      showsPrices={false}
    />
  );
  const offeredSide = (
    <TradeOfferReviewSide
      title={t(TRADE_OFFER_YOU_OFFERED_TITLE_KEYS[tradeOfferOfferKind(offer)], { count: offeredCount })}
      cards={offer.offered}
      prices={offeredPrices}
      priceSource={DEFAULT_PRICE_SOURCE}
      showsPrices={false}
    >
      <TradeOfferOfferedCash offer={offer} />
    </TradeOfferReviewSide>
  );

  return (
    <PinnedActionsLayout>
      <Pill label={t(`tradeOffers.sent.status.${offer.status}`)} tone={TRADE_OFFER_STATUS_TONES[offer.status]} />
      <AppText size="sm" tone="secondary">
        {[
          t("tradeOffers.sent.detailDescription", { date: formatDate(offer.createdAt) }),
          offer.respondedAt
            ? t("tradeOffers.sent.answeredOn", { date: formatDate(offer.respondedAt) })
            : t("tradeOffers.sent.waitingHint"),
        ].join("\n")}
      </AppText>
      <View style={{ gap: SPACING.sm }}>
        <SectionHeader title={t("tradeOffers.sent.yourDetails")} />
        <Surface style={{ gap: SPACING.xs }}>
          <AppText selectable>{offer.guestName}</AppText>
          {offer.guestContact ? (
            <AppText size="sm" tone="secondary" selectable>
              {offer.guestContact}
            </AppText>
          ) : null}
          {offer.guestNote ? (
            <AppText size="sm" tone="secondary" selectable>
              {offer.guestNote}
            </AppText>
          ) : null}
        </Surface>
      </View>
      {showsTwoColumns ? (
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: SPACING.lg }}>
          <View style={{ flex: 1, minWidth: 0 }}>{wantedSide}</View>
          <View style={{ flex: 1, minWidth: 0 }}>{offeredSide}</View>
        </View>
      ) : (
        <>
          <TabStrip
            inline
            items={[
              { value: "wanted", label: t("tradeOffers.sent.sideTabs.wanted", { count: offer.wanted.length }) },
              { value: "offered", label: t("tradeOffers.sent.sideTabs.offered", { count: offeredCount }) },
            ]}
            value={visibleSide}
            onChange={setVisibleSide}
          />
          {visibleSide === "wanted" ? wantedSide : offeredSide}
        </>
      )}
    </PinnedActionsLayout>
  );
}
