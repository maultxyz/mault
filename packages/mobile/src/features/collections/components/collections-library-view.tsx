import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useIsFocused } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { deleteCollection, emptyCollection } from "@/features/collections/api/collections";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { ListGroup } from "@/components/ui/list-group";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { SearchInput } from "@/components/ui/search-input";
import { OptionSheet } from "@/components/ui/option-sheet";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { TabStrip } from "@/components/ui/tab-strip";
import { CollectionChangeTrend } from "@/features/collections/components/collection-change-trend";
import { widgetSummaryQueryOptions } from "@/features/widgets/api/widget-summary";
import { valueChangeOf } from "@magic-vault/shared";
import { LIBRARY_CHANGE_PILL_MIN_WIDTH, LIBRARY_CHANGE_SPARKLINE, LIBRARY_VALUE_MODES } from "@/lib/constants/library";
import type { LibraryValueMode } from "@/lib/interfaces/library";
import { useCollectionActions } from "@/features/collections/api/use-collection-actions";
import { useScanTarget } from "@/features/collections/api/use-scan-target";
import { orgOverviewQueryOptions } from "@/features/home/api/overview";
import { HomeCollectionRow } from "@/features/home/components/home-collection-row";
import { useScanLocks } from "@/features/stream/api/use-app-stream";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePrefetchCollectionFirstPage } from "@/hooks/use-prefetch-collection-first-page";
import { usePricing } from "@/hooks/use-pricing";
import { useSession } from "@/lib/auth/session";
import { COLLECTION_SEARCH_MIN_COUNT } from "@/lib/constants/collections";
import { SPACING } from "@/lib/constants/theme";
import type { CollectionActionTarget } from "@/lib/interfaces/collections";
import type { LibraryViewProps } from "@/lib/interfaces/library";

export function CollectionsLibraryView({ title, viewSwitcher }: LibraryViewProps) {
  const { t, i18n } = useTranslation();
  const pricing = usePricing();
  const orgId = useActiveOrgId();
  const prefetchCollectionFirstPage = usePrefetchCollectionFirstPage();
  const { user } = useSession();
  const [search, setSearch] = useState("");
  const locks = useScanLocks();
  const { collection: scanTarget, collections: allCollections, collectionsQuery } = useScanTarget();
  const isScreenFocused = useIsFocused();
  const overview = useQuery(orgOverviewQueryOptions(orgId, isScreenFocused));
  const [valueMode, setValueMode] = useState<LibraryValueMode>("value");
  const widgetSummary = useQuery({
    ...widgetSummaryQueryOptions(orgId, Object.keys(locks).length > 0),
    enabled: !!orgId && valueMode === "change",
  });
  const trendsByGuid = new Map((widgetSummary.data?.collections ?? []).map((trend) => [trend.guid, trend]));
  const rowValue = (value: number | undefined) => (value != null ? pricing.formatCompact(value) : null);
  const rowExactValue = (value: number | undefined) => (value != null ? pricing.format(value) : null);
  const rowChange = (guid: string) => {
    const trend = trendsByGuid.get(guid);
    const change = trend ? valueChangeOf(trend, pricing.format, i18n.language) : null;
    const values = trend ? [...trend.valueHistory.map((point) => point.totalValue), trend.totalValue] : [];
    const label = change ? `${change.change}, ${change.percent}` : t("library.noChange");
    return { change, values, baseline: trend?.previousValue ?? null, label };
  };
  const scanTargetGuid = scanTarget?.guid;
  const [actionsCollection, setActionsCollection] = useState<CollectionActionTarget | null>(null);
  const collectionActions = useCollectionActions({ includesScanInto: true, shareLinkCountGuid: actionsCollection?.guid });

  const sorted = useMemo(
    () =>
      [...allCollections].sort((first, second) => {
        const firstIsLive = !!locks[first.guid];
        const secondIsLive = !!locks[second.guid];
        if (firstIsLive !== secondIsLive) return firstIsLive ? -1 : 1;
        const firstIsTarget = first.guid === scanTargetGuid;
        const secondIsTarget = second.guid === scanTargetGuid;
        if (firstIsTarget !== secondIsTarget) return firstIsTarget ? -1 : 1;
        return new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime();
      }),
    [allCollections, locks, scanTargetGuid],
  );
  const query = search.trim().toLowerCase();
  const filtered = query ? sorted.filter((collection) => collection.name.toLowerCase().includes(query)) : sorted;
  const overviewData = overview.data;
  const summary = overviewData
    ? [
        overviewData.isValuePending ? null : pricing.formatCompact(overviewData.totalValue),
        t("collection.cardsCount", { count: overviewData.cardCount }),
      ]
        .filter((part): part is string => part !== null)
        .join(" · ")
    : null;
  const openNewCollection = () => router.push("/collection-new");
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedGuids, setSelectedGuids] = useState<string[]>([]);
  const stopSelecting = () => {
    setIsSelecting(false);
    setSelectedGuids([]);
  };
  const toggleSelected = (guid: string) =>
    setSelectedGuids((current) =>
      current.includes(guid) ? current.filter((selected) => selected !== guid) : [...current, guid],
    );
  const allSelected = filtered.length > 0 && filtered.every((collection) => selectedGuids.includes(collection.guid));
  const bulk = useMutation({
    mutationFn: async (action: "empty" | "delete") => {
      for (const guid of selectedGuids) {
        if (action === "empty") await emptyCollection(guid);
        else await deleteCollection(guid);
      }
    },
    onSuccess: (_result, action) => {
      showToast({
        message: t(action === "empty" ? "collections.bulk.emptied" : "collections.bulk.deleted", {
          count: selectedGuids.length,
        }),
        tone: "success",
      });
      stopSelecting();
    },
    onError: () => showToast({ message: t("collections.bulk.failed"), tone: "destructive" }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
      void queryClient.invalidateQueries({ queryKey: ["collection-cards"] });
      void queryClient.invalidateQueries({ queryKey: ["org-overview"] });
      void queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });
  const confirmBulk = (action: "empty" | "delete") =>
    Alert.alert(
      t(action === "empty" ? "collections.bulk.emptyTitle" : "collections.bulk.deleteTitle", {
        count: selectedGuids.length,
      }),
      t(action === "empty" ? "collections.bulk.emptyDescription" : "collections.bulk.deleteDescription"),
      [
        { text: t("collections.cancel"), style: "cancel" },
        {
          text: t(action === "empty" ? "collections.emptyConfirm" : "collections.deleteConfirm"),
          style: "destructive",
          onPress: () => bulk.mutate(action),
        },
      ],
    );

  return (
    <Screen
      onRefresh={() => Promise.all([collectionsQuery.refetch(), overview.refetch()])}
      header={
        <PageHeader
          title={title}
          subtitle={summary}
          actions={
            <View style={{ flexDirection: "row", gap: SPACING.sm }}>
              {sorted.length > 0 ? (
                <IconButton
                  icon={isSelecting ? "close" : "checkAll"}
                  accessibilityLabel={isSelecting ? t("collections.bulk.doneSelecting") : t("collections.bulk.select")}
                  onPress={() => (isSelecting ? stopSelecting() : setIsSelecting(true))}
                />
              ) : null}
              <IconButton icon="search" accessibilityLabel={t("search.open")} onPress={() => router.push("/search")} />
              {sorted.length > 0 && !isSelecting ? (
                <IconButton icon="plus" variant="primary" accessibilityLabel={t("collections.new")} onPress={openNewCollection} />
              ) : null}
            </View>
          }
        >
          {viewSwitcher}
          {isSelecting ? (
            <View style={{ gap: SPACING.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm }}>
                <AppText size="sm" weight="semibold" accessibilityLiveRegion="polite">
                  {t("collections.bulk.selectedCount", { count: selectedGuids.length })}
                </AppText>
                <Button
                  size="sm"
                  variant="ghost"
                  label={allSelected ? t("collections.bulk.clear") : t("collections.bulk.selectAll")}
                  onPress={() => setSelectedGuids(allSelected ? [] : filtered.map((collection) => collection.guid))}
                />
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
                <Button
                  size="sm"
                  variant="secondary"
                  label={t("collections.empty")}
                  disabled={selectedGuids.length === 0 || bulk.isPending}
                  onPress={() => confirmBulk("empty")}
                />
                <Button
                  size="sm"
                  variant="destructive"
                  label={t("collections.delete")}
                  disabled={selectedGuids.length === 0 || bulk.isPending}
                  loading={bulk.isPending}
                  onPress={() => confirmBulk("delete")}
                />
              </View>
            </View>
          ) : null}
          {sorted.length > COLLECTION_SEARCH_MIN_COUNT ? (
            <SearchInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("home.searchPlaceholder")}
              accessibilityLabel={t("home.searchPlaceholder")}
            />
          ) : null}
          {sorted.length > 0 ? (
            <TabStrip<LibraryValueMode>
              inline
              value={valueMode}
              onChange={setValueMode}
              items={LIBRARY_VALUE_MODES.map((mode) => ({ value: mode, label: t(`library.valueModes.${mode}`) }))}
            />
          ) : null}
        </PageHeader>
      }
    >
      {collectionsQuery.isError ? <Callout tone="destructive" title={t("collections.loadFailed")} /> : null}
      {valueMode === "change" && widgetSummary.isError ? (
        <Callout
          tone="destructive"
          title={t("library.changeLoadFailed")}
          action={<Button label={t("recovery.retry")} onPress={() => void widgetSummary.refetch()} />}
        />
      ) : null}
      {collectionActions.empty.isError || collectionActions.remove.isError ? (
        <Callout
          tone="destructive"
          title={collectionActions.empty.isError ? t("collections.emptyFailed") : t("collections.deleteFailed")}
        />
      ) : null}

      {collectionsQuery.isPending ? (
        <ListSkeleton rows={5} hasSubtitle />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="collections"
          title={t("collections.emptyTitle")}
          description={t("collections.createDescription")}
          action={<Button icon="plus" label={t("collections.new")} onPress={openNewCollection} />}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon="search" title={t("home.noSearchResultsTitle")} description={t("home.noSearchResultsDescription")} />
      ) : (
        <ListGroup>
          {filtered.map((collection) => {
            const value = overviewData?.collectionValues[collection.guid];
            const lock = locks[collection.guid];
            const change = rowChange(collection.guid);
            const isScanTarget = collection.guid === scanTargetGuid;
            const statusLabel = lock
              ? lock.userId === user?.id
                ? t("home.live.yourSession")
                : t("home.live.scanningBy", { name: lock.displayName })
              : isScanTarget
                ? t("collections.scanTarget")
                : null;
            return (
              <HomeCollectionRow
                key={collection.guid}
                onPressIn={() => prefetchCollectionFirstPage(collection.guid)}
                name={collection.name}
                isScanTarget={isScanTarget}
                isLive={!!lock}
                value={valueMode === "value" ? rowValue(value) : null}
                exactValue={valueMode === "value" ? rowExactValue(value) : null}
                trailing={
                  valueMode === "change" ? (
                    widgetSummary.isPending ? (
                      <Skeleton width={LIBRARY_CHANGE_SPARKLINE.width + LIBRARY_CHANGE_PILL_MIN_WIDTH} height={LIBRARY_CHANGE_SPARKLINE.height} />
                    ) : (
                    <CollectionChangeTrend
                      values={change.values}
                      baseline={change.baseline}
                      change={change.change}
                      noChangeLabel={t("library.noChange")}
                    />
                    )
                  ) : undefined
                }
                trailingAccessibilityLabel={widgetSummary.isPending ? undefined : change.label}
                subtitle={[statusLabel, t("collection.cardsCount", { count: collection.cardCount })]
                  .filter(Boolean)
                  .join(" · ")}
                checked={isSelecting ? selectedGuids.includes(collection.guid) : undefined}
                onPress={() =>
                  isSelecting
                    ? toggleSelected(collection.guid)
                    : router.push({ pathname: "/collection/[guid]", params: { guid: collection.guid } })
                }
                onLongPress={
                  isSelecting ? undefined : () => setActionsCollection({ guid: collection.guid, name: collection.name })
                }
                longPressLabel={t("collections.actions")}
              />
            );
          })}
        </ListGroup>
      )}
      <OptionSheet
        visible={actionsCollection !== null}
        title={actionsCollection?.name ?? t("collections.actions")}
        options={collectionActions.options}
        selected={[]}
        onSelect={(action) => {
          const collection = actionsCollection;
          setActionsCollection(null);
          if (collection) collectionActions.runAction(collection, action);
        }}
        onClose={() => setActionsCollection(null)}
      />
    </Screen>
  );
}
