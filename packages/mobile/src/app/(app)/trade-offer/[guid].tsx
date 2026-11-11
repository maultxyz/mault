import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Alert, ScrollView, View } from "react-native";
import { formatPrice } from "@magic-vault/shared";
import type { TradeOfferCardsProps } from "@/lib/interfaces/trade-offers";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { pendingTradeOffersQueryOptions, respondToTradeOffer } from "@/features/trade-offers/api/trade-offers";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { TRADE_OFFER_CARD_IMAGE_WIDTH, TRADE_OFFERS_QUERY_KEY } from "@/lib/constants/trade-offers";
import { CARD_THUMBNAIL_RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";

function TradeOfferCards({ cards, prices, priceSource }: TradeOfferCardsProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  return (
    <View style={{ gap: SPACING.sm }}>
      {cards.map((card, index) => (
        <View
          key={"scanId" in card ? card.scanId : `${card.gameKey}-${card.cardId}-${index}`}
          style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}
        >
          <Image
            source={card.imageUrl ? { uri: card.imageUrl } : undefined}
            accessible={false}
            style={{
              width: TRADE_OFFER_CARD_IMAGE_WIDTH,
              aspectRatio: 2.5 / 3.5,
              borderRadius: CARD_THUMBNAIL_RADIUS,
              backgroundColor: colors.muted,
            }}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText size="sm" weight="medium" numberOfLines={2}>
              {card.name}
            </AppText>
            <AppText size="xs" tone="secondary" numberOfLines={1}>
              {[
                card.setName || card.setCode.toUpperCase(),
                card.condition,
                card.isFoil ? t("tradeOffers.foil") : null,
                "quantity" in card && card.quantity > 1 ? `×${card.quantity}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </AppText>
          </View>
          <AppText size="sm" weight="medium">
            {prices[index] == null ? t("tradeOffers.noPrice") : formatPrice(prices[index], priceSource)}
          </AppText>
        </View>
      ))}
    </View>
  );
}

export default function TradeOfferScreen() {
  const { guid } = useLocalSearchParams<{ guid: string }>();
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const orgId = useActiveOrgId();
  const queryClient = useQueryClient();
  const offers = useQuery(pendingTradeOffersQueryOptions(orgId));
  const offer = offers.data?.find((candidate) => candidate.guid === guid) ?? null;
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={offer ? t("tradeOffers.reviewTitle", { name: offer.guestName }) : t("tradeOffers.title")}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: SCREEN_GUTTER, gap: SPACING.lg }}>
        {respond.isError ? <Callout tone="destructive" title={t("tradeOffers.respondFailed")} /> : null}
        {offers.isLoading ? (
          <ListSkeleton />
        ) : !offer ? (
          <EmptyState icon="check" title={t("tradeOffers.answered")} />
        ) : (
          <>
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
            <View style={{ gap: SPACING.xs }}>
              <AppText size="sm" weight="semibold" accessibilityRole="header">
                {t("tradeOffers.contact")}
              </AppText>
              <AppText selectable>{offer.guestContact}</AppText>
              {offer.guestNote ? (
                <AppText size="sm" tone="secondary" selectable>
                  {offer.guestNote}
                </AppText>
              ) : null}
            </View>
            <View style={{ gap: SPACING.sm }}>
              <AppText size="sm" weight="semibold" accessibilityRole="header">
                {t("tradeOffers.theyWant", { count: offer.wanted.length })}
              </AppText>
              <TradeOfferCards cards={offer.wanted} prices={offer.wantedPrices} priceSource={offer.priceSource} />
            </View>
            <View style={{ gap: SPACING.sm }}>
              <AppText size="sm" weight="semibold" accessibilityRole="header">
                {t("tradeOffers.theyOffer", { count: offer.offered.length })}
              </AppText>
              <TradeOfferCards cards={offer.offered} prices={offer.offeredPrices} priceSource={offer.priceSource} />
            </View>
            <View style={{ flexDirection: "row", gap: SPACING.sm }}>
              <Button
                style={{ flex: 1 }}
                variant="destructive"
                label={t("tradeOffers.decline")}
                loading={respond.isPending && respond.variables === false}
                onPress={confirmDecline}
              />
              <Button
                style={{ flex: 1 }}
                label={t("tradeOffers.accept")}
                loading={respond.isPending && respond.variables === true}
                onPress={confirmAccept}
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
