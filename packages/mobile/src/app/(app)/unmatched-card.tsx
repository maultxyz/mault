import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, View } from "react-native";
import type { PlayingCard } from "@magic-vault/shared";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { CardCorrectionSearch } from "@/features/cards/components/card-correction-search";
import {
  identifyUnmatchedCard,
  invalidateUnmatchedCards,
  removeUnmatchedCard,
  unmatchedCardsQueryOptions,
} from "@/features/collections/api/unmatched-cards";
import { usePanelWidth } from "@/hooks/use-panel-width";
import { useTheme } from "@/hooks/use-theme";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { UNMATCHED_PHOTO_WIDTH_FRACTION } from "@/lib/constants/cards";
import { CARD_ART_RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { formatDateTime } from "@/lib/dates";
import { absoluteUrl } from "@/lib/url";

export default function UnmatchedCardScreen() {
  const { guid, scanId } = useLocalSearchParams<{ guid: string; scanId: string }>();
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const width = usePanelWidth();
  const insets = useSafeAreaInsets();
  const unmatched = useInfiniteQuery(unmatchedCardsQueryOptions(guid));
  const cards = unmatched.data?.pages.flatMap((page) => page.cards) ?? [];
  const index = cards.findIndex((card) => card.scanId === scanId);
  const scan = index >= 0 ? cards[index] : undefined;
  const nextScanId = cards.find((card, cardIndex) => cardIndex > index && card.scanId !== scanId)?.scanId;
  const [showsBackSide, setShowsBackSide] = useState(false);
  const frontUrl = absoluteUrl(scan?.capturedImageUrl);
  const backUrl = absoluteUrl(scan?.capturedBackImageUrl);
  const imageUrl = showsBackSide && backUrl ? backUrl : frontUrl;
  const photoWidth = Math.round((width - SCREEN_GUTTER * 2) * UNMATCHED_PHOTO_WIDTH_FRACTION);

  const goToNext = () => {
    if (nextScanId) router.replace({ pathname: "/unmatched-card", params: { guid, scanId: nextScanId } });
    else router.back();
  };

  const identify = useMutation({
    mutationFn: (card: PlayingCard) => identifyUnmatchedCard(guid, scanId, { card }),
    onSuccess: goToNext,
    onSettled: () => invalidateUnmatchedCards(queryClient, guid),
    onError: (error) =>
      Alert.alert(t("unmatchedCards.identifyFailed"), error instanceof Error ? error.message : undefined),
  });

  const remove = useMutation({
    mutationFn: () => removeUnmatchedCard(guid, scanId),
    onSuccess: goToNext,
    onSettled: () => invalidateUnmatchedCards(queryClient, guid),
    onError: (error) => Alert.alert(t("unmatchedCards.removeFailed"), error instanceof Error ? error.message : undefined),
  });

  const confirmRemove = () =>
    Alert.alert(t("unmatchedCards.removeTitle"), t("unmatchedCards.removeDescription"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("unmatchedCards.remove"), style: "destructive", onPress: () => remove.mutate() },
    ]);

  const isBusy = identify.isPending || remove.isPending;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={t("unmatchedCards.identifyTitle")}
        subtitle={scan ? formatDateTime(scan.scannedAt, i18n.language) : null}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: SCREEN_GUTTER, paddingBottom: SPACING.xxl, gap: SPACING.lg }}
      >
        {!scan && !unmatched.isPending ? <Callout tone="warning" title={t("unmatchedCards.notFound")} /> : null}
        {scan || unmatched.isPending ? (
          <View style={{ alignItems: "center", gap: SPACING.xs }}>
            <View
              style={{
                width: photoWidth,
                aspectRatio: CARD_ASPECT_RATIO,
                borderRadius: CARD_ART_RADIUS,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.muted,
              }}
            >
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={{ flex: 1 }}
                  contentFit="fill"
                  accessibilityLabel={showsBackSide ? t("cardDetail.capturedBackSideAlt") : t("cardDetail.capturedScan")}
                />
              ) : (
                <Skeleton height="100%" radius={0} />
              )}
            </View>
            {backUrl ? (
              <IconButton
                icon="switchSides"
                variant="plain"
                size={32}
                selected={showsBackSide}
                accessibilityLabel={showsBackSide ? t("cardDetail.showFrontSide") : t("cardDetail.showBackSide")}
                onPress={() => setShowsBackSide((value) => !value)}
              />
            ) : null}
          </View>
        ) : null}
        {scan ? (
          <View style={{ gap: SPACING.sm }}>
            <AppText size="sm" tone="secondary">
              {t("unmatchedCards.searchHint")}
            </AppText>
            <CardCorrectionSearch
              key={scanId}
              collectionGuid={guid}
              initialQuery=""
              disabled={isBusy}
              onSelect={(card) => identify.mutate(card)}
            />
          </View>
        ) : null}
      </ScrollView>
      {scan ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: SPACING.md,
            paddingBottom: SPACING.md + insets.bottom,
          }}
        >
          <Button
            variant="destructive"
            icon="trash"
            label={t("unmatchedCards.remove")}
            loading={remove.isPending}
            disabled={identify.isPending}
            onPress={confirmRemove}
          />
        </View>
      ) : null}
    </View>
  );
}
