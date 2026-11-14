import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Alert, View } from "react-native";
import { formatPrice } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";
import { respondToTradeOffer, tradeOffersQueryOptions } from "@/features/trade-offers/api/trade-offers";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { TradeOfferCards } from "@/features/trade-offers/components/trade-offer-cards";
import { TRADE_OFFER_STATUS_TONES, TRADE_OFFERS_QUERY_KEY } from "@/lib/constants/trade-offers";
import { SPACING } from "@/lib/constants/theme";

export default function TradeOfferScreen() {
  const { guid } = useLocalSearchParams<{ guid: string }>();
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const orgId = useActiveOrgId();
  const queryClient = useQueryClient();
  const offers = useQuery(tradeOffersQueryOptions(orgId));
  const offer = offers.data?.find((candidate) => candidate.guid === guid) ?? null;
  const isPending = offer?.status === "pending";
  const valueDifference = offer ? Math.round((offer.offeredValue - offer.wantedValue) * 100) / 100 : 0;
  const respond = useMutation({
    mutationFn: (accepts: boolean) => respondToTradeOffer(guid, accepts),
    onSuccess: (_, accepts) => {
      AccessibilityInfo.announceForAccessibility(
        accepts ? t("tradeOffers.accepted") : t("tradeOffers.declined"),
      );
      void queryClient.invalidateQueries({ queryKey: [TRADE_OFFERS_QUERY_KEY] });
      if (accepts) void queryClient.invalidateQueries({ queryKey: ["collection-cards"] });
      router.back();
    },
  });

  const confirmAccept = () =>
    Alert.alert(
      t("tradeOffers.acceptTitle"),
      t("tradeOffers.acceptRemovesCards", { count: offer?.wanted.length ?? 0 }),
      [
        { text: t("tradeOffers.cancel"), style: "cancel" },
        { text: t("tradeOffers.accept"), onPress: () => respond.mutate(true) },
      ],
    );

  const confirmDecline = () =>
    Alert.alert(t("tradeOffers.declineTitle"), t("tradeOffers.declineDescription"), [
      { text: t("tradeOffers.cancel"), style: "cancel" },
      { text: t("tradeOffers.decline"), style: "destructive", onPress: () => respond.mutate(false) },
    ]);

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={offer ? t("tradeOffers.reviewTitle", { name: offer.guestName }) : t("tradeOffers.title")}
      />
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
          ) : null
        }
      >
        {respond.isError ? <Callout tone="destructive" title={t("tradeOffers.respondFailed")} /> : null}
        {offers.isLoading ? (
          <ListSkeleton />
        ) : offers.isError && !offer ? (
          <Callout
            tone="destructive"
            title={t("tradeOffers.loadFailed")}
            action={<Button size="sm" variant="secondary" label={t("recovery.retry")} onPress={() => void offers.refetch()} />}
          />
        ) : !offer ? (
          <EmptyState icon="check" title={t("tradeOffers.answered")} />
        ) : (
          <>
            {!isPending ? (
              <Pill label={t(`tradeOffers.library.status.${offer.status}`)} tone={TRADE_OFFER_STATUS_TONES[offer.status]} />
            ) : null}
            <AppText size="sm" tone="secondary">
              {t("tradeOffers.reviewDescription", {
                source: offer.sourceName ?? t("tradeOffers.unknownSource"),
                date: new Date(offer.createdAt).toLocaleString(i18n.language),
              })}
            </AppText>
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
              <AppText size="xs" style={{ color: valueDifference > 0 ? colors.successForeground : valueDifference < 0 ? colors.warningForeground : colors.foregroundSecondary }}>
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
            <View style={{ gap: SPACING.sm }}>
              <SectionHeader title={t("tradeOffers.theyWant", { count: offer.wanted.length })} />
              <TradeOfferCards cards={offer.wanted} prices={offer.wantedPrices} priceSource={offer.priceSource} />
            </View>
            <View style={{ gap: SPACING.sm }}>
              <SectionHeader title={t("tradeOffers.theyOffer", { count: offer.offered.length })} />
              <TradeOfferCards cards={offer.offered} prices={offer.offeredPrices} priceSource={offer.priceSource} />
            </View>
          </>
        )}
      </PinnedActionsLayout>
    </View>
  );
}
