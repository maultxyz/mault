import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";
import { CardRow } from "@/components/cards/card-row";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListRow } from "@/components/ui/list-row";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { billingQueryOptions } from "@/features/org/api/billing";
import { storageLocationsPageQueryOptions, storageSearchQueryOptions } from "@/features/storage/api/storage";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import { LIST_END_THRESHOLD, SEARCH_DEBOUNCE_MS } from "@/lib/constants/collections";
import { SPACING } from "@/lib/constants/theme";
import { absoluteUrl } from "@/lib/url";

export default function StorageScreen() {
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
  const list = useMemo(() => locations.data?.pages.flatMap((page) => page.items) ?? [], [locations.data]);

  return (
    <Screen
      scroll={false}
      header={
        <PageHeader
          title={t("storage.title")}
          subtitle={t("storage.subtitle")}
          actions={
            !locked ? (
              <IconButton icon="plus" variant="primary" accessibilityLabel={t("storage.newLocation")} onPress={() => router.push("/storage-name")} />
            ) : null
          }
        >
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
        style={{ marginHorizontal: -SPACING.sm }}
        data={query ? [] : list}
        keyExtractor={(location) => location.guid}
        contentContainerStyle={{ paddingBottom: SPACING.xxl }}
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
          <View style={{ gap: SPACING.lg, paddingHorizontal: SPACING.sm, paddingBottom: SPACING.lg }}>
            {locked ? (
              <Callout
                tone="info"
                title={t("storage.businessOnly")}
                description={list.length > 0 ? t("storage.lockedWithLocations") : t("storage.locked")}
              />
            ) : null}
            {locations.isError ? <Callout tone="destructive" title={t("storage.actionFailed")} /> : null}
            {query ? (
              results.data && results.data.length === 0 ? (
                <EmptyState icon="search" title={t("storage.noResultsTitle")} description={t("storage.noResultsDescription", { query })} />
              ) : (
                <View style={{ marginHorizontal: -SPACING.sm }}>
                  {(results.data ?? []).map((entry) => (
                    <CardRow
                      key={entry.scanId}
                      name={entry.card.name}
                      subtitle={`${entry.locationName} · ${t("storage.position", { position: entry.position })}`}
                      imageUrl={absoluteUrl(entry.card.image?.small)}
                      onPress={() => router.push({ pathname: "/storage/[guid]", params: { guid: entry.locationGuid } })}
                    />
                  ))}
                </View>
              )
            ) : null}
          </View>
        }
        ListEmptyComponent={
          query ? null : locations.isPending ? (
            <View style={{ gap: SPACING.sm, paddingHorizontal: SPACING.sm }}>
              <Skeleton height={52} />
              <Skeleton height={52} />
            </View>
          ) : (
            <EmptyState icon="storage" title={t("storage.emptyTitle")} description={t("storage.emptyDescription")} />
          )
        }
        ListFooterComponent={
          locations.isFetchingNextPage ? <ActivityIndicator style={{ margin: SPACING.lg }} color={colors.primaryText} /> : undefined
        }
        renderItem={({ item: location }) => (
          <ListRow
            icon="storage"
            title={location.name}
            subtitle={t("storage.summary", { count: location.cardCount, value: pricing.format(location.totalValue) })}
            onPress={() => router.push({ pathname: "/storage/[guid]", params: { guid: location.guid } })}
          />
        )}
      />
    </Screen>
  );
}
