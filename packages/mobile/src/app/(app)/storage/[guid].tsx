import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, View } from "react-native";
import {
  allExportAdapters,
  DEFAULT_CARD_SORT,
  EMPTY_CARD_FILTERS,
  exportFilename,
  supportsGame,
  type CardFilters,
  type ExportAdapter,
} from "@magic-vault/shared";
import { CardRow } from "@/components/cards/card-row";
import { CardTile } from "@/components/cards/card-tile";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { TabStrip } from "@/components/ui/tab-strip";
import { Screen } from "@/components/ui/screen";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteStorageLocation,
  downloadStorageLocationCsv,
  fetchFirstUnreviewedStorageCard,
  markStorageLocationCardsDownloaded,
  storageLocationCardsPageQueryOptions,
  storageLocationCardsSummaryQueryOptions,
  storageLocationExportSummaryQueryOptions,
  storageLocationQueryOptions,
} from "@/features/storage/api/storage";
import { ExportSheet } from "@/features/cards/components/export-sheet";
import { CardToolbar } from "@/features/collections/components/card-toolbar";
import { CardViewOptionsSheet } from "@/features/collections/components/card-view-options-sheet";
import { cardSortOptions, countActiveCardFilters } from "@/features/collections/lib/card-query";
import { toStatsBreakdown } from "@/features/stats/lib/stats-breakdown";
import { StorageLocationVerify } from "@/features/storage/components/storage-location-verify";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { shareCsv } from "@/features/cards/lib/share-csv";
import { billingQueryOptions } from "@/features/org/api/billing";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import {
  CARD_GRID_COLUMNS,
  CARD_GRID_GAP_X,
  CARD_GRID_GAP_Y,
  LIST_END_THRESHOLD,
  SEARCH_DEBOUNCE_MS,
  STORAGE_CARD_VIEW_MODE_KEY,
} from "@/lib/constants/collections";
import type { CardViewMode } from "@/lib/interfaces/collections";
import { readKv, writeKv } from "@/lib/storage/kv";
import { STORAGE_LOCATION_TABS } from "@/lib/constants/storage";
import type { StorageLocationTab } from "@/lib/interfaces/storage";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import { readReviewLayout } from "@/lib/review-layout";
import { absoluteUrl } from "@/lib/url";

export default function StorageLocationScreen() {
  const { guid } = useLocalSearchParams<{ guid: string }>();
  const { t } = useTranslation();
  const colors = useTheme();
  const pricing = usePricing();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState<StorageLocationTab>("cards");
  const orgId = useActiveOrgId();
  const { data: billing } = useQuery(billingQueryOptions(orgId));
  const isStorageLocked = billing?.storage === false;
  const { data: location } = useQuery(storageLocationQueryOptions(guid));
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const [sort, setSort] = useState<string | null>(null);
  const [filters, setFilters] = useState<CardFilters>(EMPTY_CARD_FILTERS);
  const [viewOptionsOpen, setViewOptionsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<CardViewMode>(() =>
    readKv(STORAGE_CARD_VIEW_MODE_KEY) === "grid" ? "grid" : "list",
  );
  const [listWidth, setListWidth] = useState(0);
  const isGrid = viewMode === "grid";
  const tileWidth = (listWidth - SPACING.sm * 2 - CARD_GRID_GAP_X * (CARD_GRID_COLUMNS - 1)) / CARD_GRID_COLUMNS;
  const changeViewMode = (mode: CardViewMode) => {
    setViewMode(mode);
    writeKv(STORAGE_CARD_VIEW_MODE_KEY, mode);
  };
  const cardsQuery = useMemo(
    () => ({ search: debouncedSearch, sort, filters, grouped: false }),
    [debouncedSearch, sort, filters],
  );
  const cards = useInfiniteQuery(storageLocationCardsPageQueryOptions(guid, cardsQuery));
  const summary = useQuery(storageLocationCardsSummaryQueryOptions(guid));
  const breakdown = useMemo(
    () => (summary.data && summary.data.stats.totalCount > 0 ? toStatsBreakdown(summary.data.stats) : null),
    [summary.data],
  );
  const sortOptions = cardSortOptions(summary.data?.sortableFields ?? [], t("storage.positionOrder"), t);
  const activeSortAndFilterCount = countActiveCardFilters(filters) + (sort ? 1 : 0);
  const isQueryActive = !!debouncedSearch || activeSortAndFilterCount > 0 || filters.needsAttention;
  const items = useMemo(() => cards.data?.pages.flatMap((page) => page.cards) ?? [], [cards.data]);
  const [exportOpen, setExportOpen] = useState(false);
  const [combineDuplicates, setCombineDuplicates] = useState(true);
  const [notice, setNotice] = useState<{ tone: "info" | "destructive"; text: string } | null>(null);
  const exportSummary = useQuery(storageLocationExportSummaryQueryOptions(guid, exportOpen));
  const adapters = useMemo(
    () =>
      allExportAdapters.filter((adapter) =>
        (exportSummary.data?.gameKeys ?? []).every((key) => supportsGame(adapter, key ?? undefined)),
      ),
    [exportSummary.data?.gameKeys],
  );

  const runExport = useMutation({
    mutationFn: async (adapter: ExportAdapter) => {
      const scanIds = exportSummary.data?.scanIds ?? [];
      if (scanIds.length === 0) return;
      const csv = await downloadStorageLocationCsv(guid, { format: adapter.key, combineDuplicates });
      const slug = (location?.name ?? "storage").replace(/\s+/g, "-").toLowerCase();
      await shareCsv(csv, exportFilename(adapter, slug));
      markStorageLocationCardsDownloaded(guid, scanIds)
        .catch((err) => console.error("Failed to mark cards downloaded:", err))
        .finally(() => void queryClient.invalidateQueries({ queryKey: ["collection-cards"] }));
    },
    onSuccess: () => setExportOpen(false),
  });

  const startReview = async () => {
    setNotice(null);
    try {
      const first = await fetchFirstUnreviewedStorageCard(guid);
      if (!first) {
        setNotice({ tone: "info", text: t("storage.review.nothingLeft") });
        return;
      }
      if (readReviewLayout() === "grid") {
        router.push({ pathname: "/review-grid", params: { storage: guid } });
        return;
      }
      router.push({
        pathname: "/card/[scanId]",
        params: { scanId: first.scanId, guid: first.collectionGuid, review: "1", storage: guid },
      });
    } catch {
      setNotice({ tone: "destructive", text: t("storage.review.startFailed") });
    }
  };
  const remove = useMutation({
    mutationFn: () => deleteStorageLocation(guid),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["storage-locations"] });
      router.back();
    },
  });

  const runAction = (action: string) => {
    setMenuOpen(false);
    if (action === "rename") {
      router.push({ pathname: "/storage-name", params: { guid, name: location?.name ?? "" } });
      return;
    }
    Alert.alert(t("storage.deleteTitle", { name: location?.name ?? "" }), t("storage.deleteDescription"), [
      { text: t("storage.cancel"), style: "cancel" },
      { text: t("storage.delete"), style: "destructive", onPress: () => remove.mutate() },
    ]);
  };

  return (
    <Screen
      scroll={false}
      header={
        <PageHeader
          title={location?.name ?? t("storage.title")}
          subtitle={
            location ? t("storage.summary", { count: location.cardCount, value: pricing.format(location.totalValue) }) : null
          }
          onBack={() => router.back()}
          actions={
            isStorageLocked ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("storage.actions")}
              hitSlop={SPACING.sm}
              onPress={() => setMenuOpen(true)}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: RADIUS.md,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed ? colors.muted : "transparent",
              })}
            >
              <Icon name="more" size={18} color={colors.foreground} />
            </Pressable>
            )
          }
        >
          <TabStrip<StorageLocationTab>
            value={tab}
            onChange={setTab}
            items={STORAGE_LOCATION_TABS.map((value) => ({ value, label: t(`storage.verify.tabs.${value}`) }))}
          />
        </PageHeader>
      }
    >
      {tab === "verify" && location ? (
        <StorageLocationVerify key={location.guid} location={location} />
      ) : (
        <FlatList
          key={viewMode}
          style={{ marginHorizontal: -SPACING.sm }}
          onLayout={(event) => setListWidth(event.nativeEvent.layout.width)}
          data={items}
          keyExtractor={(entry) => entry.scanId}
          numColumns={isGrid ? CARD_GRID_COLUMNS : 1}
          columnWrapperStyle={isGrid ? { gap: CARD_GRID_GAP_X, paddingHorizontal: SPACING.sm } : undefined}
          contentContainerStyle={{ paddingBottom: SPACING.xxl, gap: isGrid ? CARD_GRID_GAP_Y : undefined }}
          onEndReachedThreshold={LIST_END_THRESHOLD}
          onEndReached={() => {
            if (cards.hasNextPage && !cards.isFetchingNextPage) void cards.fetchNextPage();
          }}
          refreshControl={
            <RefreshControl
              refreshing={cards.isRefetching && !cards.isFetchingNextPage}
              onRefresh={() => {
                void cards.refetch();
                void summary.refetch();
              }}
              tintColor={colors.primaryText}
              colors={[colors.primary]}
              progressBackgroundColor={colors.card}
            />
          }
          ListHeaderComponent={
            <View style={{ gap: SPACING.lg, paddingHorizontal: SPACING.sm, paddingBottom: SPACING.lg }}>
              {remove.isError ? <Callout tone="destructive" title={t("storage.actionFailed")} /> : null}
              {notice ? <Callout tone={notice.tone} title={notice.text} /> : null}
              {location && location.cardCount > 0 ? (
                <View style={{ flexDirection: "row", gap: SPACING.sm }}>
                  {isStorageLocked ? null : (
                    <Button style={{ flex: 1 }} icon="check" label={t("storage.review.start")} onPress={() => void startReview()} />
                  )}
                  <Button
                    style={{ flex: 1 }}
                    variant="secondary"
                    icon="upload"
                    label={t("export.button")}
                    onPress={() => {
                      runExport.reset();
                      setExportOpen(true);
                    }}
                  />
                </View>
              ) : null}
              {location && location.cardCount > 0 ? (
                <View style={{ gap: SPACING.md }}>
                  <SearchInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder={t("storage.searchCardsPlaceholder")}
                    accessibilityLabel={t("storage.searchCardsPlaceholder")}
                  />
                  <CardToolbar
                    activeSortAndFilterCount={activeSortAndFilterCount}
                    needsReview={filters.needsAttention}
                    onOpenViewOptions={() => setViewOptionsOpen(true)}
                    onToggleNeedsReview={() => setFilters((value) => ({ ...value, needsAttention: !value.needsAttention }))}
                  />
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            cards.isPending ? (
              <View style={{ gap: SPACING.sm, paddingHorizontal: SPACING.sm }}>
                <Skeleton height={61} />
                <Skeleton height={61} />
              </View>
            ) : (
              <EmptyState
                icon={isQueryActive ? "search" : "collections"}
                title={isQueryActive ? t("storage.noMatchingCards") : t("storage.noCardsTitle")}
              />
            )
          }
          ListFooterComponent={
            cards.isFetchingNextPage ? <ActivityIndicator style={{ margin: SPACING.lg }} color={colors.primaryText} /> : undefined
          }
          renderItem={({ item: entry }) => {
            const value = pricing.priceOf(
              entry.card,
              { isFoil: entry.isFoil, foilType: entry.foilType },
              entry.condition,
            );
            const openEntry = () =>
              router.push({ pathname: "/card/[scanId]", params: { scanId: entry.scanId, guid: entry.collectionGuid } });
            if (isGrid) {
              return (
                <View style={{ width: tileWidth }}>
                  <CardTile
                    name={entry.card.name}
                    caption={[t("storage.position", { position: entry.position }), ...(value != null ? [pricing.format(value)] : [])].join(" · ")}
                    imageUrl={absoluteUrl(entry.card.image?.normal ?? entry.card.image?.small)}
                    isFoil={entry.isFoil}
                    flagged={(entry.lowConfidenceMatch || entry.hasAlternatives) && !entry.reviewed}
                    corrected={entry.corrected || entry.reviewed}
                    onPress={openEntry}
                  />
                </View>
              );
            }
            return (
              <CardRow
                name={entry.card.name}
                subtitle={`${t("storage.position", { position: entry.position })} · ${entry.collectionName}`}
                imageUrl={absoluteUrl(entry.card.image?.small)}
                price={value != null ? pricing.format(value) : null}
                lowConfidence={entry.lowConfidenceMatch && !entry.reviewed}
                onPress={() =>
                  router.push({ pathname: "/card/[scanId]", params: { scanId: entry.scanId, guid: entry.collectionGuid } })
                }
              />
            );
          }}
        />
      )}
      <ExportSheet
        visible={exportOpen}
        title={t("export.title", { name: location?.name ?? "" })}
        adapters={adapters}
        loading={exportSummary.isPending}
        exporting={runExport.isPending}
        failed={runExport.isError || exportSummary.isError}
        combineDuplicates={combineDuplicates}
        onCombineDuplicatesChange={setCombineDuplicates}
        onExport={(adapter) => runExport.mutate(adapter)}
        onClose={() => setExportOpen(false)}
      />
      <CardViewOptionsSheet
        visible={viewOptionsOpen}
        viewMode={viewMode}
        onViewModeChange={changeViewMode}
        sortOptions={sortOptions}
        selectedSort={sort ?? DEFAULT_CARD_SORT}
        onSortChange={(value) => setSort(value === DEFAULT_CARD_SORT ? null : value)}
        filters={filters}
        breakdown={breakdown}
        onChange={setFilters}
        onClose={() => setViewOptionsOpen(false)}
      />
      <OptionSheet
        visible={menuOpen}
        title={location?.name ?? t("storage.actions")}
        options={[
          { value: "rename", label: t("storage.rename") },
          { value: "delete", label: t("storage.delete") },
        ]}
        selected={[]}
        onSelect={runAction}
        onClose={() => setMenuOpen(false)}
      />
    </Screen>
  );
}
