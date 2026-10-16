import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import {
  collectionCardQueryOptions,
  removeCollectionCard,
  scanImageQueryOptions,
} from "@/features/collections/api/collection-cards";
import { CardDetailsList } from "@/features/cards/components/card-details-list";
import { cardStorageLocationQueryOptions } from "@/features/storage/api/storage";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { absoluteUrl } from "@/lib/url";

export default function CardDetailScreen() {
  const { scanId, guid } = useLocalSearchParams<{ scanId: string; guid: string }>();
  const { t } = useTranslation();
  const colors = useTheme();
  const pricing = usePricing();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const position = useQuery(collectionCardQueryOptions(guid, scanId));
  const image = useQuery(scanImageQueryOptions(guid, scanId));
  const storage = useQuery(cardStorageLocationQueryOptions(guid, scanId));
  const entry = position.data?.entry.scanId === scanId ? position.data.entry : null;
  const card = entry?.card;
  const price = entry ? pricing.priceOf(entry.card, entry.isFoil, entry.condition) : null;
  const capturedUrl = absoluteUrl(image.data);
  const showCaptured = image.isPending || !!capturedUrl;

  const remove = useMutation({
    mutationFn: () => removeCollectionCard(guid, scanId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["collection-cards", guid] });
      void queryClient.invalidateQueries({ queryKey: ["org-overview"] });
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
      router.back();
    },
  });

  const confirmRemove = () =>
    Alert.alert(t("cardDetail.removeConfirmTitle"), t("cardDetail.removeConfirmDescription"), [
      { text: t("cardDetail.cancel"), style: "cancel" },
      { text: t("cardDetail.remove"), style: "destructive", onPress: () => remove.mutate() },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={card?.name ?? t("cardDetail.fallbackTitle")}
        subtitle={card?.typeLine}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.xl, gap: SPACING.xl }}>
        {position.isError ? <Callout tone="destructive" title={t("cardDetail.loadFailed")} /> : null}
        {remove.isError ? <Callout tone="destructive" title={t("cardDetail.removeFailed")} /> : null}

        <View style={{ flexDirection: "row", gap: SPACING.md, alignItems: "flex-start" }}>
          {showCaptured ? (
            <View style={{ flex: 1, gap: 6 }}>
              <AppText size="xs" tone="secondary">
                {t("cardDetail.capturedScan")}
              </AppText>
              <View
                style={{
                  aspectRatio: CARD_ASPECT_RATIO,
                  borderRadius: RADIUS.lg,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.muted,
                }}
              >
                {capturedUrl ? (
                  <Image source={{ uri: capturedUrl }} style={{ flex: 1 }} contentFit="fill" />
                ) : (
                  <Skeleton height="100%" radius={0} />
                )}
              </View>
            </View>
          ) : null}
          <View style={{ flex: 1, gap: 6 }}>
            {showCaptured ? (
              <AppText size="xs" tone="secondary">
                {t("cardDetail.matchedCard")}
              </AppText>
            ) : null}
            <View
              style={{
                aspectRatio: CARD_ASPECT_RATIO,
                borderRadius: RADIUS.lg,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.muted,
              }}
            >
              {card ? (
                <Image
                  source={{ uri: absoluteUrl(card.image?.normal ?? card.image?.small) ?? undefined }}
                  style={{ flex: 1 }}
                  contentFit="cover"
                  transition={120}
                />
              ) : null}
            </View>
          </View>
        </View>

        {entry ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, alignItems: "center" }}>
            {price != null ? (
              <AppText size="xl" heading weight="semibold" style={{ fontVariant: ["tabular-nums"] }}>
                {pricing.format(price)}
              </AppText>
            ) : null}
            {entry.isFoil ? <Pill tone="info" label={entry.foilType ?? t("cardDetail.foil")} /> : null}
            {entry.lowConfidenceMatch && !entry.reviewed ? <Pill tone="warning" label={t("cards.needsReview")} /> : null}
          </View>
        ) : null}

        {card ? (
          <View style={{ gap: SPACING.sm }}>
            <AppText
              size="xs"
              weight="medium"
              tone="secondary"
              style={{ textTransform: "uppercase", letterSpacing: 0.6 }}
            >
              {t("cardDetail.details")}
            </AppText>
            <CardDetailsList card={card} binNumber={entry?.binNumber} />
            {storage.data ? (
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push({ pathname: "/storage/[guid]", params: { guid: storage.data?.guid ?? "" } })}
                style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs, marginTop: SPACING.xs }}
              >
                <Icon name="collections" size={14} color={colors.primaryText} />
                <AppText tone="primary">
                  {t("storage.storedIn", { name: storage.data.name, position: storage.data.position })}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        ) : position.isPending ? (
          <View style={{ gap: SPACING.sm }}>
            <Skeleton height={16} width="60%" />
            <Skeleton height={16} width="45%" />
            <Skeleton height={16} width="55%" />
          </View>
        ) : null}
      </ScrollView>
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: SPACING.lg,
          paddingBottom: SPACING.lg + insets.bottom,
        }}
      >
        <Button
          variant="destructive"
          size="lg"
          icon="trash"
          label={t("cardDetail.remove")}
          loading={remove.isPending}
          disabled={!entry}
          onPress={confirmRemove}
        />
      </View>
    </View>
  );
}
