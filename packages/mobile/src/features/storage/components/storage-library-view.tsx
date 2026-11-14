import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, RefreshControl, View } from "react-native";
import { CardRow } from "@/components/cards/card-row";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListRow } from "@/components/ui/list-row";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { SearchInput } from "@/components/ui/search-input";
import { OptionSheet } from "@/components/ui/option-sheet";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { ListGroupItem } from "@/components/ui/list-group-item";
import { Surface } from "@/components/ui/surface";
import { AppText } from "@/components/ui/app-text";
import { ListLoadingFooter } from "@/components/ui/list-loading-footer";
import { billingQueryOptions } from "@/features/org/api/billing";
import { storageLocationsPageQueryOptions, storageSearchQueryOptions } from "@/features/storage/api/storage";
import { useStorageLocationActions } from "@/features/storage/api/use-storage-location-actions";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import { LIST_END_THRESHOLD, SEARCH_DEBOUNCE_MS } from "@/lib/constants/collections";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { LibraryViewProps } from "@/lib/interfaces/library";
import type { StorageLocationActionTarget } from "@/lib/interfaces/storage";
import { absoluteUrl } from "@/lib/url";

export function StorageLibraryView({ title, viewSwitcher }: LibraryViewProps) {
  const { t } = useTranslation();
  const pricing = usePricing();
  const colors = useTheme();
  const orgId = useActiveOrgId();
  const [search, setSearch] = useState("");
  const query = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const locations = useInfiniteQuery(storageLocationsPageQueryOptions(orgId));
  const results = useQuery(storageSearchQueryOptions(query));
  const { data: billing } = useQuery(billingQueryOptions(orgId));
  const locked = billing?.storage === false;
  const [actionsLocation, setActionsLocation] = useState<StorageLocationActionTarget | null>(null);
  const locationActions = useStorageLocationActions({ shareLinkCountGuid: actionsLocation?.guid });
  const list = useMemo(() => locations.data?.pages.flatMap((page) => page.items) ?? [], [locations.data]);

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
              {list.length > 0 ? (
                <IconButton
                  icon="checkAll"
                  accessibilityLabel={t("storage.pickList.open")}
                  onPress={() => router.push("/storage-pick-list")}
                />
              ) : null}
              {!locked ? (
                <IconButton icon="plus" variant="primary" accessibilityLabel={t("storage.newLocation")} onPress={() => router.push("/storage-name")} />
              ) : null}
            </View>
          }
        >
          {viewSwitcher}
          {list.length > 0 ? (
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
          <RefreshControl
            refreshing={locations.isRefetching && !locations.isFetchingNextPage}
            onRefresh={() => void locations.refetch()}
            tintColor={colors.primaryText}
            colors={[colors.primary]}
            progressBackgroundColor={colors.card}
          />
        }
        ListHeaderComponent={
          locked || locations.isError || locationActions.remove.isError || query ? (
            <View style={{ gap: SPACING.lg, paddingBottom: SPACING.lg }}>
              {locked ? (
                <Callout
                  tone="info"
                  title={t("storage.businessOnly")}
                  description={list.length > 0 ? t("storage.lockedWithLocations") : t("storage.locked")}
                />
              ) : null}
              {locations.isError || locationActions.remove.isError ? (
                <Callout tone="destructive" title={t("storage.actionFailed")} />
              ) : null}
              {query ? (
                results.data && results.data.length === 0 ? (
                  <EmptyState icon="search" title={t("storage.noResultsTitle")} description={t("storage.noResultsDescription", { query })} />
                ) : (
                  <Surface style={{ padding: SPACING.sm }}>
                    {(results.data ?? []).map((entry) => (
                      <CardRow
                        key={entry.scanId}
                        name={entry.card.name}
                        subtitle={`${entry.locationName} · ${t("storage.position", { position: entry.position })}`}
                        imageUrl={absoluteUrl(entry.card.image?.small)}
                        onPress={() => router.push({ pathname: "/storage/[guid]", params: { guid: entry.locationGuid } })}
                      />
                    ))}
                  </Surface>
                )
              ) : null}
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          query ? undefined : locations.isPending ? (
            <ListSkeleton rows={3} />
          ) : (
            <EmptyState icon="storage" title={t("storage.emptyTitle")} description={t("storage.emptyDescription")} />
          )
        }
        ListFooterComponent={
          locations.isFetchingNextPage ? <ListLoadingFooter /> : undefined
        }
        renderItem={({ item: location, index }) => (
          <ListGroupItem index={index} count={list.length}>
            <ListRow
              icon="storage"
              title={location.name}
              subtitle={t("collection.cardsCount", { count: location.cardCount })}
              right={
                <AppText weight="semibold" numberOfLines={1}>
                  {pricing.format(location.totalValue)}
                </AppText>
              }
              onPress={() => router.push({ pathname: "/storage/[guid]", params: { guid: location.guid } })}
              onLongPress={locked ? undefined : () => setActionsLocation({ guid: location.guid, name: location.name })}
              longPressLabel={t("storage.actions")}
            />
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
    </Screen>
  );
}
