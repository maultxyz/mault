import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { STORAGE_LOCATION_BULK_MAX } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";
import { formatStorageSlot } from "@magic-vault/shared";
import { FlatList, View } from "react-native";
import { PullToRefreshControl } from "@/components/ui/pull-to-refresh-control";
import { CardRow } from "@/components/cards/card-row";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListRow } from "@/components/ui/list-row";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Screen } from "@/components/ui/screen";
import { SearchInput } from "@/components/ui/search-input";
import { OptionSheet } from "@/components/ui/option-sheet";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { ListGroupItem } from "@/components/ui/list-group-item";
import { ListGroup } from "@/components/ui/list-group";
import { AppText } from "@/components/ui/app-text";
import { ListLoadingFooter } from "@/components/ui/list-loading-footer";
import { CheckboxIndicator } from "@/components/ui/checkbox-indicator";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { useStorageBulkActions } from "@/features/storage/api/use-storage-bulk-actions";
import { useStoragePlanUses } from "@/features/storage/api/use-storage-plan-uses";
import { setStorageSelection } from "@/features/storage/lib/storage-selection-store";
import { billingQueryOptions } from "@/features/org/api/billing";
import { storageLocationsPageQueryOptions, storageSearchQueryOptions } from "@/features/storage/api/storage";
import { usePrefetchStorageLocation } from "@/features/storage/api/use-prefetch-storage-location";
import { useStorageLocationActions } from "@/features/storage/api/use-storage-location-actions";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import { LIST_END_THRESHOLD, SEARCH_DEBOUNCE_MS } from "@/lib/constants/collections";
import { STORAGE_ADD_ROUTES, STORAGE_BULK_SIZE_ROUTE } from "@/lib/constants/storage";
import { storageLocationFillLabel } from "@/features/storage/lib/storage-location-fill";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { LibraryViewProps } from "@/lib/interfaces/library";
import type { StorageLocationActionTarget, StoragePlanBulkMode } from "@/lib/interfaces/storage";
import { absoluteUrl } from "@/lib/url";

export function StorageLibraryView({ title, viewSwitcher }: LibraryViewProps) {
  const { t } = useTranslation();
  const pricing = usePricing();
  const orgId = useActiveOrgId();
  const [search, setSearch] = useState("");
  const query = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const locations = useInfiniteQuery(storageLocationsPageQueryOptions(orgId));
  const results = useQuery(storageSearchQueryOptions(query));
  const { data: billing } = useQuery(billingQueryOptions(orgId));
  const locked = billing?.storage === false;
  const [actionsLocation, setActionsLocation] = useState<StorageLocationActionTarget | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const locationActions = useStorageLocationActions({ shareLinkCountGuid: actionsLocation?.guid });
  const prefetchStorageLocation = usePrefetchStorageLocation();
  const list = useMemo(() => locations.data?.pages.flatMap((page) => page.items) ?? [], [locations.data]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedGuids, setSelectedGuids] = useState<string[]>([]);
  const [planMode, setPlanMode] = useState<StoragePlanBulkMode | null>(null);
  const { sets: presets } = useRulesData();
  const stopSelecting = () => {
    setIsSelecting(false);
    setSelectedGuids([]);
  };
  const bulk = useStorageBulkActions({ selectedGuids, onFinished: stopSelecting });
  const { usesOf } = useStoragePlanUses();
  const toggleSelected = (guid: string) =>
    setSelectedGuids((current) =>
      current.includes(guid)
        ? current.filter((selected) => selected !== guid)
        : current.length < STORAGE_LOCATION_BULK_MAX
          ? [...current, guid]
          : current,
    );
  const allSelected = list.length > 0 && list.every((location) => selectedGuids.includes(location.guid));
  const planPresets =
    planMode === "remove"
      ? presets.filter((preset) => preset.fillStorageLocationGuids.some((guid) => selectedGuids.includes(guid)))
      : presets;
  const hasSelection = selectedGuids.length > 0;
  const isBulkPending = bulk.remove.isPending || bulk.plan.isPending;

  return (
    <Screen
      scroll={false}
      contentStartsWithList
      header={
        <PageHeader
          title={title}
          subtitle={t("storage.subtitle")}
          actions={
            <View style={{ flexDirection: "row", gap: SPACING.sm }}>
              {!locked && list.length > 0 ? (
                <IconButton
                  icon={isSelecting ? "close" : "success"}
                  accessibilityLabel={isSelecting ? t("storage.bulk.doneSelecting") : t("storage.bulk.select")}
                  onPress={() => (isSelecting ? stopSelecting() : setIsSelecting(true))}
                />
              ) : null}
              {list.length > 0 && !isSelecting ? (
                <IconButton
                  icon="checkAll"
                  accessibilityLabel={t("storage.pickList.open")}
                  onPress={() => router.push("/storage-pick-list")}
                />
              ) : null}
              {!locked && !isSelecting ? (
                <IconButton icon="plus" variant="primary" accessibilityLabel={t("storage.newLocation")} onPress={() => setIsAddMenuOpen(true)} />
              ) : null}
            </View>
          }
        >
          {viewSwitcher}
          {isSelecting ? (
            <View style={{ gap: SPACING.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm }}>
                <AppText size="sm" weight="semibold" accessibilityLiveRegion="polite">
                  {t("storage.bulk.selectedCount", { count: selectedGuids.length })}
                </AppText>
                <Button
                  size="sm"
                  variant="ghost"
                  label={allSelected ? t("storage.bulk.clear") : t("storage.bulk.selectAll")}
                  onPress={() =>
                    setSelectedGuids(
                      allSelected ? [] : list.slice(0, STORAGE_LOCATION_BULK_MAX).map((location) => location.guid),
                    )
                  }
                />
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
                <Button
                  size="sm"
                  variant="secondary"
                  label={t("storage.bulk.setSize")}
                  disabled={!hasSelection || isBulkPending}
                  onPress={() => {
                    setStorageSelection(selectedGuids);
                    router.push(STORAGE_BULK_SIZE_ROUTE);
                  }}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  label={t("storage.bulk.addToPlan")}
                  disabled={!hasSelection || isBulkPending || presets.length === 0}
                  onPress={() => setPlanMode("add")}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  label={t("storage.bulk.removeFromPlan")}
                  disabled={!hasSelection || isBulkPending || presets.length === 0}
                  onPress={() => setPlanMode("remove")}
                />
                <Button
                  size="sm"
                  variant="destructive"
                  label={t("storage.delete")}
                  disabled={!hasSelection || isBulkPending}
                  loading={bulk.remove.isPending}
                  onPress={bulk.confirmDelete}
                />
              </View>
            </View>
          ) : null}
          {list.length > 0 && !isSelecting ? (
            <SearchInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("storage.searchPlaceholder")}
              accessibilityLabel={t("storage.searchPlaceholder")}
            />
          ) : null}
        </PageHeader>
      }
    >
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        style={{ marginHorizontal: -SCREEN_GUTTER }}
        data={query ? [] : list}
        keyExtractor={(location) => location.guid}
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: SCREEN_GUTTER, paddingBottom: SPACING.xxl }}
        keyboardShouldPersistTaps="handled"
        onEndReachedThreshold={LIST_END_THRESHOLD}
        onEndReached={() => {
          if (!query && locations.hasNextPage && !locations.isFetchingNextPage) void locations.fetchNextPage();
        }}
        refreshControl={
          <PullToRefreshControl
            onRefresh={() => locations.refetch()}
          />
        }
        ListHeaderComponent={
          locked || (locations.isError && list.length > 0) || locationActions.remove.isError || query ? (
            <View style={{ gap: SPACING.lg, paddingBottom: SPACING.lg }}>
              {locked ? (
                <Callout
                  tone="info"
                  title={t("storage.businessOnly")}
                  description={list.length > 0 ? t("storage.lockedWithLocations") : t("storage.locked")}
                />
              ) : null}
              {locations.isError && list.length > 0 ? (
                <Callout
                  tone="destructive"
                  title={t("storage.loadFailed")}
                  action={
                    <Button
                      size="sm"
                      variant="secondary"
                      label={t("recovery.retry")}
                      loading={locations.isRefetching}
                      onPress={() => void locations.refetch()}
                    />
                  }
                />
              ) : null}
              {locationActions.remove.isError ? <Callout tone="destructive" title={t("storage.deleteFailed")} /> : null}
              {query ? (
                results.isError ? (
                  <Callout
                    tone="destructive"
                    title={t("storage.searchFailed")}
                    action={
                      <Button
                        size="sm"
                        variant="secondary"
                        label={t("recovery.retry")}
                        loading={results.isRefetching}
                        onPress={() => void results.refetch()}
                      />
                    }
                  />
                ) : results.isPending ? (
                  <ListSkeleton rows={3} leading="thumbnail" hasSubtitle hasTrailing={false} />
                ) : results.data.length === 0 ? (
                  <EmptyState icon="search" title={t("storage.noResultsTitle")} description={t("storage.noResultsDescription", { query })} />
                ) : (
                  <ListGroup>
                    {results.data.map((entry) => (
                      <CardRow
                        key={entry.scanId}
                        name={entry.card.name}
                        subtitle={`${entry.locationName} · ${t("storage.position", { position: formatStorageSlot(entry.position, entry.locationBatchSize) })}`}
                        imageUrl={absoluteUrl(entry.card.image?.small)}
                        onPress={() =>
                          router.push({
                            pathname: "/card/[scanId]",
                            params: { scanId: entry.scanId, guid: entry.collectionGuid },
                          })
                        }
                      />
                    ))}
                  </ListGroup>
                )
              ) : null}
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          query ? undefined : locations.isPending ? (
            <ListSkeleton rows={5} hasSubtitle />
          ) : locations.isError ? (
            <QueryErrorState
              title={t("storage.loadFailed")}
              onRetry={() => void locations.refetch()}
              isRetrying={locations.isRefetching}
            />
          ) : (
            <EmptyState icon="storage" title={t("storage.emptyTitle")} description={t("storage.emptyDescription")} />
          )
        }
        ListFooterComponent={
          locations.isFetchingNextPage ? <ListLoadingFooter /> : undefined
        }
        renderItem={({ item: location, index }) => (
          <ListGroupItem index={index} count={list.length}>
            {isSelecting ? (
              <ListRow
                title={location.name}
                subtitle={storageLocationFillLabel(location, t, usesOf(location.guid).length)}
                leading={<CheckboxIndicator checked={selectedGuids.includes(location.guid)} />}
                checked={selectedGuids.includes(location.guid)}
                onPress={() => toggleSelected(location.guid)}
              />
            ) : (
            <ListRow
              icon="storage"
              title={location.name}
              subtitle={storageLocationFillLabel(location, t, usesOf(location.guid).length)}
              right={
                <AppText weight="semibold" numberOfLines={1} accessibilityLabel={pricing.format(location.totalValue)}>
                  {pricing.formatCompact(location.totalValue)}
                </AppText>
              }
              onPress={() => router.push({ pathname: "/storage/[guid]", params: { guid: location.guid } })}
              onPressIn={() => prefetchStorageLocation(location.guid)}
              onLongPress={locked ? undefined : () => setActionsLocation({ guid: location.guid, name: location.name })}
              longPressLabel={t("storage.actions")}
            />
            )}
          </ListGroupItem>
        )}
      />
      <OptionSheet
        visible={actionsLocation !== null}
        title={actionsLocation?.name ?? t("storage.actions")}
        options={locationActions.options}
        selected={[]}
        onSelect={(action) => {
          const location = actionsLocation;
          setActionsLocation(null);
          if (location) locationActions.runAction(location, action);
        }}
        onClose={() => setActionsLocation(null)}
      />
      <OptionSheet
        visible={planMode !== null}
        title={planMode === "remove" ? t("storage.bulk.removeFromPlan") : t("storage.bulk.addToPlan")}
        description={t("storage.bulk.pickPreset", { count: selectedGuids.length })}
        options={planPresets.map((preset) => ({ value: preset.guid, label: preset.name }))}
        emptyMessage={t("storage.bulk.noPresets")}
        selected={[]}
        onSelect={(presetGuid) => {
          const mode = planMode;
          setPlanMode(null);
          if (mode) bulk.plan.mutate({ presetGuid, mode });
        }}
        onClose={() => setPlanMode(null)}
      />
      <OptionSheet
        visible={isAddMenuOpen}
        title={t("storage.add")}
        options={[
          { value: "location", label: t("storage.newLocation") },
          { value: "series", label: t("storage.series.title"), description: t("storage.series.menuDescription") },
        ]}
        selected={[]}
        onSelect={(choice) => {
          setIsAddMenuOpen(false);
          router.push(STORAGE_ADD_ROUTES[choice === "series" ? "series" : "location"]);
        }}
        onClose={() => setIsAddMenuOpen(false)}
      />
    </Screen>
  );
}
