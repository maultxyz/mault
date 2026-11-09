import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, FlatList, RefreshControl, View } from "react-native";
import {
  computeBinCount,
  DEFAULT_MODULE_COUNT,
  deviceTimeZone,
  EMPTY_CARD_FILTERS,
  formatScanTimelineBucketLabel,
  groupCardsByScanTime,
  isScanTimelineGrouping,
  type CardFilters,
  type GroupedScannedCard,
} from "@magic-vault/shared";
import { CardTile } from "@/components/cards/card-tile";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  collectionCardsQueryOptions,
  collectionCardsSummaryQueryOptions,
  reviewQueueQueryOptions,
  scanTimelineBucketsQueryOptions,
} from "@/features/collections/api/collection-cards";
import { toScanTimelineListRows } from "@/features/collections/lib/scan-timeline-rows";
import { CardActionsSheet } from "@/features/collections/components/card-actions-sheet";
import { CardViewOptionsSheet } from "@/features/collections/components/card-view-options-sheet";
import { CardToolbar } from "@/features/collections/components/card-toolbar";
import { collectionsQueryOptions, deleteCollection, emptyCollection } from "@/features/collections/api/collections";
import { useScanTarget } from "@/features/collections/api/use-scan-target";
import { useSessionStream } from "@/features/monitor/api/use-session-stream";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { cardSortOptions, countActiveCardFilters } from "@/features/collections/lib/card-query";
import { toStatsBreakdown } from "@/features/stats/lib/stats-breakdown";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import { usePanelWidth } from "@/hooks/use-panel-width";
import {
  CARD_ASPECT_RATIO,
  CARD_GRID_COLUMNS,
  CARD_GRID_GAP_X,
  CARD_GRID_GAP_Y,
  CARD_GRID_GUTTER,
  COLLECTION_SCAN_TIMELINE_KEY,
  LIST_END_THRESHOLD,
  SEARCH_DEBOUNCE_MS,
} from "@/lib/constants/collections";
import { CARD_ART_RADIUS, FLOATING_BUTTON_SHADOW, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { BUTTON_HEIGHTS } from "@/lib/constants/ui";
import type { CollectionScanTimeline, ScanTimelineListRow } from "@/lib/interfaces/collections";
import { readReviewLayout } from "@/lib/review-layout";
import { readKv, writeKv } from "@/lib/storage/kv";
import { absoluteUrl } from "@/lib/url";

export default function CollectionScreen() {
  const { guid } = useLocalSearchParams<{ guid: string }>();
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const pricing = usePricing();
  const queryClient = useQueryClient();
  const width = usePanelWidth();
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const collectionsOptions = collectionsQueryOptions(useActiveOrgId());
  const { data: collections } = useQuery(collectionsOptions);
  const collection = collections?.find((c) => c.guid === guid);
  const [grouped, setGrouped] = useState(true);
  const [sort, setSort] = useState<string | null>(null);
  const [filters, setFilters] = useState<CardFilters>(EMPTY_CARD_FILTERS);
  const [viewOptionsOpen, setViewOptionsOpen] = useState(false);
  const [scanTimeline, setScanTimeline] = useState<CollectionScanTimeline>(() => {
    const stored = readKv(COLLECTION_SCAN_TIMELINE_KEY);
    return isScanTimelineGrouping(stored) ? stored : "off";
  });
  const changeScanTimeline = (next: CollectionScanTimeline) => {
    setScanTimeline(next);
    writeKv(COLLECTION_SCAN_TIMELINE_KEY, next);
  };
  const scanTimelineGrouping = scanTimeline === "off" ? null : scanTimeline;
  const scanTimelineTimeZone = useMemo(() => deviceTimeZone(), []);
  const [actionsEntry, setActionsEntry] = useState<GroupedScannedCard | null>(null);
  const sorter = useSorter();
  const cardsQuery = useMemo(
    () => ({
      search: debounced,
      sort: scanTimelineGrouping ? null : sort,
      filters,
      grouped: scanTimelineGrouping ? false : grouped,
    }),
    [debounced, sort, filters, grouped, scanTimelineGrouping],
  );
  const cards = useInfiniteQuery(collectionCardsQueryOptions(guid, cardsQuery));
  const summary = useQuery(collectionCardsSummaryQueryOptions(guid));
  const scanTimelineBuckets = useQuery({
    ...scanTimelineBucketsQueryOptions(guid, cardsQuery, scanTimelineGrouping ?? "day", scanTimelineTimeZone),
    enabled: !!scanTimelineGrouping,
  });
  const reviewQueue = useQuery(reviewQueueQueryOptions(guid));
  const stream = useSessionStream(guid);
  const { setScanTargetGuid } = useScanTarget();
  const [actionsOpen, setActionsOpen] = useState(false);
  const empty = useMutation({
    mutationFn: () => emptyCollection(guid),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["collection-cards", guid] });
      void queryClient.invalidateQueries({ queryKey: ["org-overview"] });
      void queryClient.invalidateQueries({ queryKey: collectionsOptions.queryKey });
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteCollection(guid),
    onSuccess: (next) => {
      queryClient.setQueryData(collectionsOptions.queryKey, next);
      void queryClient.invalidateQueries({ queryKey: ["org-overview"] });
      void queryClient.invalidateQueries({ queryKey: ["billing"] });
      router.back();
    },
  });
  const runAction = (action: string) => {
    setActionsOpen(false);
    const name = collection?.name ?? "";
    if (action === "rename") {
      router.push({ pathname: "/collection-rename", params: { guid } });
    } else if (action === "empty") {
      Alert.alert(t("collections.empty"), t("collections.emptyDescription", { name }), [
        { text: t("collections.cancel"), style: "cancel" },
        { text: t("collections.emptyConfirm"), style: "destructive", onPress: () => empty.mutate() },
      ]);
    } else if (action === "share") {
      router.push({ pathname: "/share-link", params: { kind: "collection", guid } });
    } else if (action === "delete") {
      Alert.alert(t("collections.delete"), t("collections.deleteDescription", { name }), [
        { text: t("collections.cancel"), style: "cancel" },
        { text: t("collections.deleteConfirm"), style: "destructive", onPress: () => remove.mutate() },
      ]);
    }
  };

  const items = useMemo(() => cards.data?.pages.flatMap((page) => page.items) ?? [], [cards.data]);
  const totalCards = cards.data?.pages[0]?.totalCards ?? collection?.cardCount ?? 0;
  const scanTimelineRows = useMemo(
    () =>
      scanTimelineGrouping
        ? toScanTimelineListRows(
            groupCardsByScanTime(items, scanTimelineGrouping, scanTimelineBuckets.data?.buckets),
            CARD_GRID_COLUMNS,
          )
        : [],
    [items, scanTimelineGrouping, scanTimelineBuckets.data],
  );
  const stats = summary.data?.all;
  const breakdown = useMemo(() => (stats && stats.totalCount > 0 ? toStatsBreakdown(stats) : null), [stats]);
  const binCount = computeBinCount(sorter.device?.moduleCount ?? DEFAULT_MODULE_COUNT);
  const foilOptions = collection?.game?.foilTypes?.length ? collection.game.foilTypes : [t("cardDetail.foil")];
  const sortOptions = cardSortOptions(collection?.game?.fieldDefinitions ?? [], t("collection.sort.scanOrder"), sort, t);
  const activeSortAndFilterCount =
    countActiveCardFilters(filters) + (sort && !scanTimelineGrouping ? 1 : 0) + (scanTimelineGrouping ? 1 : 0);

  const hasPricing = !!stats && stats.priceableCount > 0;
  const tileWidth = (width - CARD_GRID_GUTTER * 2 - CARD_GRID_GAP_X * (CARD_GRID_COLUMNS - 1)) / CARD_GRID_COLUMNS;
  const headerSummary = [
    collection?.game?.name,
    t("collection.cardsCount", { count: totalCards }),
    hasPricing && stats ? pricing.format(stats.totalValue) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const scanIntoCollection = () => {
    setScanTargetGuid(guid);
    router.navigate("/scan");
  };

  const reviewFirstScanId = reviewQueue.data?.firstScanId;
  const openReview = () =>
    readReviewLayout() === "grid"
      ? router.push({ pathname: "/review-grid", params: { guid } })
      : router.push({
          pathname: "/card/[scanId]",
          params: { scanId: reviewFirstScanId ?? "", guid, review: "1" },
        });

  const openUnmatched = () => router.push({ pathname: "/unmatched/[guid]", params: { guid } });

  const openCard = (scanId: string) => router.push({ pathname: "/card/[scanId]", params: { scanId, guid } });

  const renderCardTile = (item: GroupedScannedCard) => {
    const price = pricing.priceOf(
      item.card,
      { isFoil: item.isFoil, foilType: item.foilType },
      item.condition,
    );
    const flagged = !!item.lowConfidenceMatch || !!item.alternativeMatches?.length;
    return (
      <View key={item.scanId} style={{ width: tileWidth }}>
        <CardTile
          name={item.card.name}
          caption={
            price != null
              ? pricing.format(price)
              : `${item.card.set.toUpperCase()} #${item.card.collectorNumber}`
          }
          imageUrl={absoluteUrl(item.card.image?.normal ?? item.card.image?.small)}
          quantity={item.quantity}
          flagged={flagged}
          corrected={!!item.corrected || !!item.reviewed}
          onPress={() => openCard(item.scanId)}
          onLongPress={() => setActionsEntry(item)}
        />
      </View>
    );
  };

  const sharedListProps = {
    keyboardShouldPersistTaps: "handled" as const,
    contentContainerStyle: {
      paddingHorizontal: CARD_GRID_GUTTER,
      paddingBottom: SPACING.xxl + BUTTON_HEIGHTS.md + SPACING.lg,
      gap: CARD_GRID_GAP_Y,
    },
    onEndReachedThreshold: LIST_END_THRESHOLD,
    onEndReached: () => {
      if (cards.hasNextPage && !cards.isFetchingNextPage) void cards.fetchNextPage();
    },
    refreshControl: (
      <RefreshControl
        refreshing={cards.isRefetching && !cards.isFetchingNextPage}
        onRefresh={() => {
          void cards.refetch();
          void summary.refetch();
          if (scanTimelineGrouping) void scanTimelineBuckets.refetch();
        }}
        tintColor={colors.primaryText}
        colors={[colors.primary]}
        progressBackgroundColor={colors.card}
      />
    ),
    ListHeaderComponent: (
      <View style={{ gap: SPACING.md, paddingTop: SPACING.lg }}>
        {stream.errors.map((message, index) => (
          <Callout key={`${index}-${message}`} tone="destructive" title={t("monitor.scanError")} description={message} />
        ))}
        {cards.isError ? <Callout tone="destructive" title={t("collections.cardsLoadFailed")} /> : null}
      </View>
    ),
    ListEmptyComponent: cards.isPending ? (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: CARD_GRID_GAP_X, rowGap: CARD_GRID_GAP_Y }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} width={tileWidth} height={tileWidth / CARD_ASPECT_RATIO} radius={CARD_ART_RADIUS} />
        ))}
      </View>
    ) : (
      <EmptyState
        icon={debounced ? "search" : "collections"}
        title={debounced ? t("collection.noMatches") : t("collection.noCardsYet")}
      />
    ),
    ListFooterComponent: cards.isFetchingNextPage ? (
      <ActivityIndicator
        style={{ margin: SPACING.lg }}
        color={colors.primaryText}
        accessibilityLabel={t("collection.loadingMoreCards")}
      />
    ) : undefined,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={collection?.name ?? t("collections.title")}
        subtitle={headerSummary}
        onBack={() => router.back()}
        actions={
          collection ? (
            <>
              <IconButton
                icon="stats"
                accessibilityLabel={t("collection.viewStats")}
                onPress={() => router.push({ pathname: "/stats", params: { collection: guid } })}
              />
              <IconButton icon="more" accessibilityLabel={t("collections.actions")} onPress={() => setActionsOpen(true)} />
            </>
          ) : null
        }
      >
        {reviewFirstScanId || stream.unmatchedCount > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
            {reviewFirstScanId ? (
              <PillButton
                tone="info"
                icon="check"
                label={t("collection.reviewBadge", { count: reviewQueue.data?.total ?? 0 })}
                onPress={openReview}
              />
            ) : null}
            {stream.unmatchedCount > 0 ? (
              <PillButton
                tone="warning"
                icon="help"
                label={t("unmatchedCards.badge", { count: stream.unmatchedCount })}
                onPress={openUnmatched}
              />
            ) : null}
          </View>
        ) : null}
        <CardToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t("collection.searchPlaceholder")}
          searchAccessibilityLabel={t("collections.search")}
          activeSortAndFilterCount={activeSortAndFilterCount}
          onOpenViewOptions={() => setViewOptionsOpen(true)}
        />
      </PageHeader>

      {empty.isError || remove.isError ? (
        <View style={{ paddingHorizontal: CARD_GRID_GUTTER, paddingTop: SPACING.md }}>
          <Callout tone="destructive" title={empty.isError ? t("collections.emptyFailed") : t("collections.deleteFailed")} />
        </View>
      ) : null}
      <OptionSheet
        visible={actionsOpen}
        title={collection?.name ?? t("collections.actions")}
        options={[
          { value: "share", label: t("collections.shareLink") },
          { value: "rename", label: t("collections.rename") },
          { value: "empty", label: t("collections.empty") },
          { value: "delete", label: t("collections.delete") },
        ]}
        selected={[]}
        onSelect={runAction}
        onClose={() => setActionsOpen(false)}
      />

      {scanTimelineGrouping ? (
        <FlatList<ScanTimelineListRow>
          key="scan-timeline"
          data={scanTimelineRows}
          keyExtractor={(row) => row.key}
          {...sharedListProps}
          renderItem={({ item: row }) =>
            row.kind === "header" ? (
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: SPACING.sm, paddingTop: SPACING.sm }}>
                <AppText size="sm" weight="semibold" accessibilityRole="header" style={{ flexShrink: 1 }}>
                  {formatScanTimelineBucketLabel(row.bucketKey, scanTimelineGrouping, i18n.language)}
                </AppText>
                <AppText size="xs" tone="secondary">
                  {t("collection.scanTimelineBlockCount", { count: row.cardCount })}
                </AppText>
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: CARD_GRID_GAP_X }}>
                {row.cards.map(renderCardTile)}
              </View>
            )
          }
        />
      ) : (
        <FlatList
          key="cards"
          data={items}
          keyExtractor={(item) => item.scanId}
          numColumns={CARD_GRID_COLUMNS}
          columnWrapperStyle={{ gap: CARD_GRID_GAP_X }}
          {...sharedListProps}
          renderItem={({ item }) => renderCardTile(item)}
        />
      )}
      {collection ? (
        <View pointerEvents="box-none" style={{ position: "absolute", right: SCREEN_GUTTER, bottom: SCREEN_GUTTER }}>
          <Button
            icon="scan"
            label={t("collections.scan")}
            accessibilityLabel={t("collections.scanInto")}
            onPress={scanIntoCollection}
            style={{ ...FLOATING_BUTTON_SHADOW, shadowColor: colors.popoverShadow }}
          />
        </View>
      ) : null}
      <CardViewOptionsSheet
        visible={viewOptionsOpen}
        grouped={grouped}
        onGroupedChange={setGrouped}
        scanTimeline={scanTimeline}
        onScanTimelineChange={changeScanTimeline}
        sortOptions={sortOptions}
        onSortChange={(value) => setSort(value === "scan-desc" ? null : value)}
        filters={filters}
        breakdown={breakdown}
        binCount={binCount}
        onChange={setFilters}
        onClose={() => setViewOptionsOpen(false)}
      />
      <CardActionsSheet
        entry={actionsEntry}
        collectionGuid={guid}
        foilOptions={foilOptions}
        onClose={() => setActionsEntry(null)}
      />
    </View>
  );
}
