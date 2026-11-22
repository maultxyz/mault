import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { removeUnmatchedScans, UNMATCHED_BULK_SELECTION_MAX } from "@magic-vault/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, FlatList, Pressable, View } from "react-native";
import { PullToRefreshControl } from "@/components/ui/pull-to-refresh-control";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { CheckboxIndicator } from "@/components/ui/checkbox-indicator";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import { ListLoadingFooter } from "@/components/ui/list-loading-footer";
import { useToast } from "@/components/ui/toast-provider";
import { CollectionGridSkeleton } from "@/features/collections/components/collection-grid-skeleton";
import {
  clearUnmatchedCards,
  invalidateUnmatchedCards,
  removeUnmatchedCard,
  unmatchedCardsQueryOptions,
} from "@/features/collections/api/unmatched-cards";
import { useRetryUnmatchedCards } from "@/features/collections/api/use-retry-unmatched-cards";
import { useUnmatchedScanSelection } from "@/features/collections/api/use-unmatched-scan-selection";
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
  const retry = useRetryUnmatchedCards(guid);
  const selection = useUnmatchedScanSelection();
  const selectedCount = selection.selectedScanIds.length;
  const [isRemovingSelected, setIsRemovingSelected] = useState(false);
  const isBulkActionRunning = retry.isRetrying || isRemovingSelected;
  const allLoadedSelected = cards.length > 0 && cards.every((card) => selection.isSelected(card.scanId));

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

  const confirmRetry = () =>
    Alert.alert(
      t("unmatchedCards.retry.confirmTitle", { count: selectedCount }),
      t("unmatchedCards.retry.confirmDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("unmatchedCards.retry.confirm"),
          onPress: () => {
            const scanIds = selection.selectedScanIds;
            selection.stopSelecting();
            void retry.start(scanIds);
          },
        },
      ],
    );

  const removeSelected = async () => {
    const scanIds = selection.selectedScanIds;
    setIsRemovingSelected(true);
    const { removedCount, failedCount } = await removeUnmatchedScans({
      scanIds,
      removeScan: (scanId) => removeUnmatchedCard(guid, scanId).then(() => true),
    });
    selection.stopSelecting();
    setIsRemovingSelected(false);
    invalidateUnmatchedCards(queryClient, guid);
    if (failedCount > 0) {
      showToast({ message: t("unmatchedCards.selection.removeFailed", { count: failedCount }), tone: "destructive" });
    } else if (removedCount > 0) {
      showToast({ message: t("unmatchedCards.selection.removed", { count: removedCount }), tone: "success" });
    }
  };

  const confirmRemoveSelected = () =>
    Alert.alert(
      t("unmatchedCards.selection.removeTitle", { count: selectedCount }),
      t("unmatchedCards.removeAllDescription"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("unmatchedCards.selection.remove"),
          style: "destructive",
          onPress: () => void removeSelected(),
        },
      ],
    );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={t("unmatchedCards.title")}
        subtitle={unmatched.data ? t("unmatchedCards.count", { count: total }) : null}
        onBack={() => router.back()}
        actions={
          total > 0 ? (
            <View style={{ flexDirection: "row", gap: SPACING.sm }}>
              <IconButton
                icon={selection.isSelecting ? "close" : "success"}
                accessibilityLabel={
                  selection.isSelecting ? t("unmatchedCards.selection.doneSelecting") : t("unmatchedCards.selection.select")
                }
                disabled={isBulkActionRunning}
                onPress={selection.isSelecting ? selection.stopSelecting : selection.startSelecting}
              />
              {selection.isSelecting ? null : (
                <IconButton
                  icon="trash"
                  accessibilityLabel={t("unmatchedCards.removeAll")}
                  disabled={clear.isPending || isBulkActionRunning}
                  onPress={confirmClear}
                />
              )}
            </View>
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
            {total > 0 || retry.isRetrying ? (
              <AppText size="sm" tone="secondary">
                {selection.isSelecting
                  ? t("unmatchedCards.selection.hint", { max: UNMATCHED_BULK_SELECTION_MAX })
                  : t("unmatchedCards.hint")}
              </AppText>
            ) : null}
            {retry.progress ? (
              <View style={{ gap: SPACING.sm }}>
                <Button variant="secondary" icon="stop" label={t("unmatchedCards.retry.stop")} onPress={retry.stop} />
                <AppText size="sm" tone="secondary" accessibilityLiveRegion="polite">
                  {t("unmatchedCards.retry.progress", {
                    checked: retry.progress.checkedCount,
                    total: retry.progress.totalCount,
                    count: retry.progress.matchedCount,
                  })}
                </AppText>
              </View>
            ) : null}
            {selection.isSelecting ? (
              <View style={{ gap: SPACING.sm }}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm }}
                >
                  <AppText size="sm" weight="semibold" accessibilityLiveRegion="polite">
                    {t("unmatchedCards.selection.selected", { count: selectedCount })}
                  </AppText>
                  <Button
                    size="sm"
                    variant="ghost"
                    label={allLoadedSelected ? t("unmatchedCards.selection.clear") : t("unmatchedCards.selection.selectLoaded")}
                    onPress={() =>
                      allLoadedSelected ? selection.clear() : selection.selectMany(cards.map((card) => card.scanId))
                    }
                  />
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon="refresh"
                    label={t("unmatchedCards.retry.action")}
                    disabled={selectedCount === 0 || isBulkActionRunning}
                    onPress={confirmRetry}
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    label={t("unmatchedCards.selection.remove")}
                    disabled={selectedCount === 0 || isBulkActionRunning}
                    loading={isRemovingSelected}
                    onPress={confirmRemoveSelected}
                  />
                </View>
              </View>
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
          const isSelected = selection.isSelected(item.scanId);
          return (
            <Pressable
              accessibilityRole={selection.isSelecting ? "checkbox" : "button"}
              accessibilityLabel={
                selection.isSelecting
                  ? t("unmatchedCards.selection.selectScan", { scannedAt })
                  : t("unmatchedCards.identifyScan", { scannedAt })
              }
              accessibilityState={selection.isSelecting ? { checked: isSelected } : undefined}
              onPress={() =>
                selection.isSelecting
                  ? selection.toggle(item.scanId)
                  : router.push({ pathname: "/unmatched-card", params: { guid, scanId: item.scanId } })
              }
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
                {selection.isSelecting ? (
                  <View style={{ position: "absolute", top: SPACING.xs, right: SPACING.xs }}>
                    <CheckboxIndicator checked={isSelected} />
                  </View>
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
