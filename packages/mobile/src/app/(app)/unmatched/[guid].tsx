import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, FlatList, Pressable, View } from "react-native";
import { PullToRefreshControl } from "@/components/ui/pull-to-refresh-control";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import { ListLoadingFooter } from "@/components/ui/list-loading-footer";
import { useToast } from "@/components/ui/toast-provider";
import { CollectionGridSkeleton } from "@/features/collections/components/collection-grid-skeleton";
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
import { CARD_ART_RADIUS, SPACING } from "@/lib/constants/theme";
import { formatDateTime } from "@/lib/dates";
import { absoluteUrl } from "@/lib/url";

export default function UnmatchedCardsScreen() {
  const { guid } = useLocalSearchParams<{ guid: string }>();
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const width = usePanelWidth();
  const tileWidth = (width - CARD_GRID_GUTTER * 2 - CARD_GRID_GAP_X * (CARD_GRID_COLUMNS - 1)) / CARD_GRID_COLUMNS;
  const unmatched = useInfiniteQuery(unmatchedCardsQueryOptions(guid));
  const cards = unmatched.data?.pages.flatMap((page) => page.cards) ?? [];
  const total = unmatched.data?.pages[0]?.total ?? 0;

  const clear = useMutation({
    mutationFn: () => clearUnmatchedCards(guid),
    onSettled: () => invalidateUnmatchedCards(queryClient, guid),
    onError: () => showToast({ message: t("unmatchedCards.removeFailed"), tone: "destructive" }),
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
          <PullToRefreshControl
            onRefresh={() => unmatched.refetch()}
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
            <CollectionGridSkeleton tileWidth={tileWidth} />
          ) : unmatched.isError ? undefined : (
            <EmptyState
              icon="check"
              title={t("unmatchedCards.emptyTitle")}
              description={t("unmatchedCards.emptyDescription")}
            />
          )
        }
        ListFooterComponent={
          unmatched.isFetchingNextPage ? (
            <ListLoadingFooter />
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
              style={({ pressed }) => ({ width: tileWidth, gap: 6, transform: [{ scale: pressed ? 0.97 : 1 }] })}
            >
              <View
                style={{
                  aspectRatio: CARD_ASPECT_RATIO,
                  borderRadius: CARD_ART_RADIUS,
                  overflow: "hidden",
                  backgroundColor: colors.muted,
                }}
              >
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={{ flex: 1 }} contentFit="fill" accessible={false} />
                ) : null}
              </View>
              <AppText size="xs" tone="secondary" numberOfLines={1} style={{ paddingHorizontal: 2 }}>
                {scannedAt}
              </AppText>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
