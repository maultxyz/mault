import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, ActivityIndicator, FlatList, RefreshControl, View } from "react-native";
import type { DeletedItem } from "@magic-vault/shared";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { SearchInput } from "@/components/ui/search-input";
import { SelectField } from "@/components/ui/select-field";
import { deletedItemsQueryOptions, restoreDeletedItem } from "@/features/admin/api/deleted-items";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { DeletedItemRow } from "@/features/admin/components/deleted-item-row";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useTheme } from "@/hooks/use-theme";
import { ALL_DELETED_ITEM_TYPES, DELETED_ITEM_TYPE_FILTERS } from "@/lib/constants/admin-deleted";
import { LIST_END_THRESHOLD, SEARCH_DEBOUNCE_MS } from "@/lib/constants/collections";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { DeletedItemsNotice, DeletedItemTypeFilter } from "@/lib/interfaces/admin-deleted";

function DeletedItemsScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<DeletedItemTypeFilter>(ALL_DELETED_ITEM_TYPES);
  const [isTypeSheetOpen, setIsTypeSheetOpen] = useState(false);
  const [notice, setNotice] = useState<DeletedItemsNotice | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim().toLowerCase(), SEARCH_DEBOUNCE_MS);
  const deletedItems = useInfiniteQuery(
    deletedItemsQueryOptions({
      search: debouncedSearch,
      type: typeFilter === ALL_DELETED_ITEM_TYPES ? null : typeFilter,
    }),
  );
  const items = useMemo(() => deletedItems.data?.pages.flatMap((page) => page.items) ?? [], [deletedItems.data]);
  const totalCount = deletedItems.data?.pages[0]?.total ?? null;
  const isFiltered = !!debouncedSearch || typeFilter !== ALL_DELETED_ITEM_TYPES;

  const typeFilterLabel = (type: DeletedItemTypeFilter) =>
    type === ALL_DELETED_ITEM_TYPES ? t("admin.deleted.allTypes") : t(`admin.deleted.types.${type}`);

  const showRestoreError = (message?: string) =>
    setNotice({ tone: "destructive", text: message || t("admin.deleted.restoreError") });

  const restore = useMutation({
    mutationFn: (item: DeletedItem) => restoreDeletedItem(item.type, item.guid),
    onMutate: () => setNotice(null),
    onSuccess: (result, item) => {
      if (!result.success) {
        showRestoreError(result.message);
        return;
      }
      void queryClient.invalidateQueries();
      const restoredText = t("admin.deleted.restored", { name: item.name });
      setNotice({ tone: "success", text: restoredText });
      AccessibilityInfo.announceForAccessibility(restoredText);
    },
    onError: () => showRestoreError(),
  });

  return (
    <Screen
      scroll={false}
      padded={false}
      header={
        <PageHeader
          title={t("admin.sections.deleted.title")}
          subtitle={totalCount === null ? null : t("admin.deleted.count", { count: totalCount })}
          onBack={() => router.back()}
        />
      }
    >
      <FlatList
        accessibilityLabel={t("admin.sections.deleted.title")}
        data={items}
        keyExtractor={(item) => `${item.type}-${item.guid}`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: SPACING.xxl }}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
        onEndReachedThreshold={LIST_END_THRESHOLD}
        onEndReached={() => {
          if (deletedItems.hasNextPage && !deletedItems.isFetchingNextPage) void deletedItems.fetchNextPage();
        }}
        refreshControl={
          <RefreshControl
            refreshing={deletedItems.isRefetching && !deletedItems.isFetchingNextPage}
            onRefresh={() => void deletedItems.refetch()}
            tintColor={colors.primaryText}
            colors={[colors.primary]}
            progressBackgroundColor={colors.card}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: SPACING.md, padding: SCREEN_GUTTER }}>
            <Callout title={t("admin.deleted.description")} />
            {notice ? <Callout tone={notice.tone} title={notice.text} /> : null}
            <SearchInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("admin.deleted.searchPlaceholder")}
              accessibilityLabel={t("admin.deleted.searchPlaceholder")}
            />
            <SelectField
              label={t("admin.deleted.typeLabel")}
              value={typeFilterLabel(typeFilter)}
              placeholder={t("admin.deleted.allTypes")}
              onPress={() => setIsTypeSheetOpen(true)}
            />
          </View>
        }
        ListEmptyComponent={
          deletedItems.isPending ? (
            <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
              <ListSkeleton rows={6} />
            </View>
          ) : deletedItems.isError ? (
            <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
              <Callout tone="destructive" title={t("admin.deleted.loadError")} />
            </View>
          ) : (
            <View style={{ padding: SCREEN_GUTTER }}>
              <EmptyState
                icon={isFiltered ? "search" : "trash"}
                title={isFiltered ? t("admin.deleted.noMatches") : t("admin.deleted.empty")}
              />
            </View>
          )
        }
        ListFooterComponent={
          deletedItems.isFetchingNextPage ? (
            <ActivityIndicator
              style={{ margin: SPACING.lg }}
              color={colors.primaryText}
              accessibilityLabel={t("admin.deleted.loadingMore")}
            />
          ) : undefined
        }
        renderItem={({ item }) => (
          <DeletedItemRow
            item={item}
            isRestoring={
              restore.isPending && restore.variables?.guid === item.guid && restore.variables.type === item.type
            }
            isRestoreDisabled={restore.isPending}
            onRestore={(restoredItem) => restore.mutate(restoredItem)}
          />
        )}
      />
      <OptionSheet
        visible={isTypeSheetOpen}
        title={t("admin.deleted.typeLabel")}
        options={DELETED_ITEM_TYPE_FILTERS.map((type) => ({ value: type, label: typeFilterLabel(type) }))}
        selected={[typeFilter]}
        onSelect={(value) => {
          setTypeFilter(DELETED_ITEM_TYPE_FILTERS.find((type) => type === value) ?? ALL_DELETED_ITEM_TYPES);
          setIsTypeSheetOpen(false);
        }}
        onClose={() => setIsTypeSheetOpen(false)}
      />
    </Screen>
  );
}

export default function AdminDeletedRoute() {
  return (
    <AdminGate>
      <DeletedItemsScreen />
    </AdminGate>
  );
}
