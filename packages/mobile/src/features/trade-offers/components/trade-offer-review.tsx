import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Alert, useWindowDimensions, View } from "react-native";
import {
  TRADE_OFFER_THEY_OFFER_TITLE_KEYS,
  formatPrice,
  isTradeOfferBeingPicked,
  tradeOfferOfferKind,
  tradeOfferOfferedCardCount,
  tradeOfferPickProgress,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Pill } from "@/components/ui/pill";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";
import { TabStrip } from "@/components/ui/tab-strip";
import {
  acceptTradeOfferWithPickList,
  declineTradeOffer,
} from "@/features/trade-offers/api/trade-offers";
import { useTradeOfferPicking } from "@/features/trade-offers/api/use-trade-offer-picking";
import { TradeOfferOfferedCash } from "@/features/trade-offers/components/trade-offer-offered-cash";
import { TradeOfferPickList } from "@/features/trade-offers/components/trade-offer-pick-list";
import { TradeOfferReviewSide } from "@/features/trade-offers/components/trade-offer-review-side";
import { useTheme } from "@/hooks/use-theme";
import { SPACING } from "@/lib/constants/theme";
import {
  TRADE_OFFER_STATUS_TONES,
  TRADE_OFFER_TWO_COLUMN_MIN_WINDOW_WIDTH,
  TRADE_OFFERS_QUERY_KEY,
} from "@/lib/constants/trade-offers";
import type { TradeOfferReviewProps, TradeOfferSide } from "@/lib/interfaces/trade-offers";

export function TradeOfferReview({ offer }: TradeOfferReviewProps) {
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const showsTwoColumns = width >= TRADE_OFFER_TWO_COLUMN_MIN_WINDOW_WIDTH;
  const [visibleSide, setVisibleSide] = useState<TradeOfferSide>("wanted");
  const picking = useTradeOfferPicking(offer);
  const isPending = offer.status === "pending";
  const isPicking = isTradeOfferBeingPicked(offer);
  const progress = tradeOfferPickProgress(offer.wanted, picking.remainingScanIds);
  const offeredCount = tradeOfferOfferedCardCount(offer);
  const valueDifference = Math.round((offer.offeredValue - offer.wantedValue) * 100) / 100;
  const respond = useMutation({
    mutationFn: (accepts: boolean) =>
      accepts ? acceptTradeOfferWithPickList(offer.guid) : declineTradeOffer(offer.guid),
    onSuccess: (_, accepts) => {
      AccessibilityInfo.announceForAccessibility(
        accepts ? t("tradeOffers.pickList.started") : t("tradeOffers.declined"),
      );
      void queryClient.invalidateQueries({ queryKey: [TRADE_OFFERS_QUERY_KEY] });
      if (!accepts) router.back();
    },
  });

  const confirmAccept = () =>
    Alert.alert(t("tradeOffers.acceptTitle"), t("tradeOffers.pickList.acceptDescription", { count: offer.wanted.length }), [
      { text: t("tradeOffers.cancel"), style: "cancel" },
      { text: t("tradeOffers.accept"), onPress: () => respond.mutate(true) },
    ]);

  const confirmDecline = () =>
    Alert.alert(t("tradeOffers.declineTitle"), t("tradeOffers.declineDescription"), [
      { text: t("tradeOffers.cancel"), style: "cancel" },
      { text: t("tradeOffers.decline"), style: "destructive", onPress: () => respond.mutate(false) },
    ]);

  const confirmFinish = () =>
    Alert.alert(
      t("tradeOffers.pickList.finishTitle"),
      t("tradeOffers.pickList.finishDescription", { count: picking.remainingScanIds.length }),
      [
        { text: t("tradeOffers.cancel"), style: "cancel" },
        { text: t("tradeOffers.pickList.finish"), style: "destructive", onPress: picking.finish },
      ],
    );

  const wantedSide = isPicking ? (
    <TradeOfferPickList
      offer={offer}
      remainingScanIds={picking.remainingScanIds}
      placements={picking.placements}
      onPicked={picking.markPicked}
    />
  ) : (
    <TradeOfferReviewSide
      title={t("tradeOffers.theyWant", { count: offer.wanted.length })}
      cards={offer.wanted}
      prices={offer.wantedPrices}
      placements={offer.wantedPlacements}
      priceSource={offer.priceSource}
    />
  );
  const offeredSide = (
    <TradeOfferReviewSide
      title={t(TRADE_OFFER_THEY_OFFER_TITLE_KEYS[tradeOfferOfferKind(offer)], { count: offeredCount })}
      cards={offer.offered}
      prices={offer.offeredPrices}
      priceSource={offer.priceSource}
    >
      <TradeOfferOfferedCash offer={offer} />
    </TradeOfferReviewSide>
  );

  return (
    <PinnedActionsLayout
      actionsDirection="row"
      actions={
        isPending ? (
          <>
            <Button
              style={{ flex: 1 }}
              variant="destructive"
              label={t("tradeOffers.decline")}
              loading={respond.isPending && respond.variables === false}
              disabled={respond.isPending}
              onPress={confirmDecline}
            />
            <Button
              style={{ flex: 1 }}
              label={t("tradeOffers.accept")}
              loading={respond.isPending && respond.variables === true}
              disabled={respond.isPending}
              onPress={confirmAccept}
            />
          </>
        ) : isPicking ? (
          <Button
            style={{ flex: 1 }}
            label={t("tradeOffers.pickList.finish")}
            loading={picking.isFinishing}
            disabled={picking.isFinishing}
            onPress={confirmFinish}
          />
        ) : null
      }
    >
      {respond.isError ? <Callout tone="destructive" title={t("tradeOffers.respondFailed")} /> : null}
      {picking.pickError ? <Callout tone="destructive" title={picking.pickError} /> : null}
      {!isPending ? (
        <Pill label={t(`tradeOffers.library.status.${offer.status}`)} tone={TRADE_OFFER_STATUS_TONES[offer.status]} />
      ) : null}
      <AppText size="sm" tone="secondary">
        {t("tradeOffers.reviewDescription", {
          source: offer.sourceName ?? t("tradeOffers.unknownSource"),
          date: new Date(offer.createdAt).toLocaleString(i18n.language),
        })}
      </AppText>
      {isPending ? (
        <AppText size="sm" tone="secondary">
          {t("tradeOffers.pickList.acceptHint")}
        </AppText>
      ) : null}
      {isPicking ? (
        <Surface style={{ gap: SPACING.sm }}>
          <AppText size="sm" weight="medium" accessibilityLiveRegion="polite">
            {t("tradeOffers.pickList.progress", { picked: progress.pickedCount, count: progress.totalCount })}
          </AppText>
          <View style={{ flexDirection: "row" }}>
            <ProgressBar
              fraction={progress.totalCount > 0 ? progress.pickedCount / progress.totalCount : 0}
              accessibilityValue={{ min: 0, max: progress.totalCount, now: progress.pickedCount }}
            />
          </View>
        </Surface>
      ) : null}
      <Surface style={{ gap: SPACING.sm }}>
        <View style={{ flexDirection: "row", gap: SPACING.md }}>
          <View style={{ flex: 1 }}>
            <AppText size="xs" tone="secondary">
              {t("tradeOffers.theyGetValue")}
            </AppText>
            <AppText size="lg" weight="semibold">
              {formatPrice(offer.wantedValue, offer.priceSource)}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText size="xs" tone="secondary">
              {t("tradeOffers.youGetValue")}
            </AppText>
            <AppText size="lg" weight="semibold">
              {formatPrice(offer.offeredValue, offer.priceSource)}
            </AppText>
          </View>
        </View>
        <AppText
          size="xs"
          style={{
            color:
              valueDifference > 0
                ? colors.successForeground
                : valueDifference < 0
                  ? colors.warningForeground
                  : colors.foregroundSecondary,
          }}
        >
          {valueDifference > 0
            ? t("tradeOffers.youGainValue", { amount: formatPrice(valueDifference, offer.priceSource) })
            : valueDifference < 0
              ? t("tradeOffers.youLoseValue", { amount: formatPrice(-valueDifference, offer.priceSource) })
              : t("tradeOffers.evenValue")}
        </AppText>
        {[...offer.wantedPrices, ...offer.offeredPrices].some((price) => price == null) ? (
          <AppText size="xs" tone="secondary">
            {t("tradeOffers.missingPrices")}
          </AppText>
        ) : null}
      </Surface>
      <View style={{ gap: SPACING.sm }}>
        <SectionHeader title={t("tradeOffers.contact")} />
        <Surface style={{ gap: SPACING.xs }}>
          <AppText selectable>{offer.guestContact}</AppText>
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
              { value: "wanted", label: t("tradeOffers.sideTabs.wanted", { count: offer.wanted.length }) },
              { value: "offered", label: t("tradeOffers.sideTabs.offered", { count: offeredCount }) },
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
