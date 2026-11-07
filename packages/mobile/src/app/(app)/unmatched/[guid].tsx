import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  clearUnmatchedCards,
  invalidateUnmatchedCards,
  unmatchedCardsQueryOptions,
} from "@/features/collections/api/unmatched-cards";
import { usePanelWidth } from "@/hooks/use-panel-width";
import { useTheme } from "@/hooks/use-theme";
import {
  CARD_ASPECT_RATIO,
  CARD_GRID_COLUMNS,
  CARD_GRID_GAP_X,
  CARD_GRID_GAP_Y,
  CARD_GRID_GUTTER,
  LIST_END_THRESHOLD,
} from "@/lib/constants/collections";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import { formatDateTime } from "@/lib/dates";
import { absoluteUrl } from "@/lib/url";

export default function UnmatchedCardsScreen() {
  const { guid } = useLocalSearchParams<{ guid: string }>();
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const width = usePanelWidth();
  const tileWidth = (width - CARD_GRID_GUTTER * 2 - CARD_GRID_GAP_X * (CARD_GRID_COLUMNS - 1)) / CARD_GRID_COLUMNS;
  const unmatched = useInfiniteQuery(unmatchedCardsQueryOptions(guid));
  const cards = unmatched.data?.pages.flatMap((page) => page.cards) ?? [];
  const total = unmatched.data?.pages[0]?.total ?? 0;

  const clear = useMutation({
    mutationFn: () => clearUnmatchedCards(guid),
    onSettled: () => invalidateUnmatchedCards(queryClient, guid),
    onError: (error) => Alert.alert(t("unmatchedCards.removeFailed"), error instanceof Error ? error.message : undefined),
  });

  const confirmClear = () =>
    Alert.alert(t("unmatchedCards.removeAllTitle", { count: total }), t("unmatchedCards.removeAllDescription"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("unmatchedCards.removeAll"), style: "destructive", onPress: () => clear.mutate() },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={t("unmatchedCards.title")}
        subtitle={unmatched.data ? t("unmatchedCards.count", { count: total }) : null}
        onBack={() => router.back()}
        actions={
          total > 0 ? (
            <IconButton
              icon="trash"
              accessibilityLabel={t("unmatchedCards.removeAll")}
              disabled={clear.isPending}
              onPress={confirmClear}
            />
          ) : null
        }
      />
      <FlatList
        data={cards}
        keyExtractor={(card) => card.scanId}
        numColumns={CARD_GRID_COLUMNS}
        columnWrapperStyle={{ gap: CARD_GRID_GAP_X }}
        contentContainerStyle={{ paddingHorizontal: CARD_GRID_GUTTER, paddingBottom: SPACING.xxl, gap: CARD_GRID_GAP_Y }}
        onEndReachedThreshold={LIST_END_THRESHOLD}
        onEndReached={() => {
          if (unmatched.hasNextPage && !unmatched.isFetchingNextPage) void unmatched.fetchNextPage();
        }}
        refreshControl={
          <RefreshControl
            refreshing={unmatched.isRefetching && !unmatched.isFetchingNextPage}
            onRefresh={() => void unmatched.refetch()}
            tintColor={colors.primaryText}
            colors={[colors.primary]}
            progressBackgroundColor={colors.card}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: SPACING.md, paddingTop: SPACING.lg }}>
            {unmatched.isError ? <Callout tone="destructive" title={t("unmatchedCards.loadFailed")} /> : null}
            {total > 0 ? (
              <AppText size="sm" tone="secondary">
                {t("unmatchedCards.hint")}
              </AppText>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          unmatched.isPending ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: CARD_GRID_GAP_X, rowGap: CARD_GRID_GAP_Y }}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} width={tileWidth} height={tileWidth / CARD_ASPECT_RATIO} radius={RADIUS.lg} />
              ))}
            </View>
          ) : unmatched.isError ? null : (
            <EmptyState
              icon="check"
              title={t("unmatchedCards.emptyTitle")}
              description={t("unmatchedCards.emptyDescription")}
            />
          )
        }
        ListFooterComponent={
          unmatched.isFetchingNextPage ? (
            <ActivityIndicator style={{ margin: SPACING.lg }} color={colors.primaryText} />
          ) : undefined
        }
        renderItem={({ item }) => {
          const scannedAt = formatDateTime(item.scannedAt, i18n.language);
          const imageUrl = absoluteUrl(item.capturedImageUrl);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("unmatchedCards.identifyScan", { scannedAt })}
              onPress={() => router.push({ pathname: "/unmatched-card", params: { guid, scanId: item.scanId } })}
              style={{ width: tileWidth, gap: SPACING.xs }}
            >
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
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={{ flex: 1 }} contentFit="fill" accessible={false} />
                ) : null}
              </View>
              <AppText size="2xs" tone="secondary" numberOfLines={1}>
                {scannedAt}
              </AppText>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
