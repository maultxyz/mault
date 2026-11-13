import { useQuery } from "@tanstack/react-query";
import { router, useIsFocused } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { ListGroup } from "@/components/ui/list-group";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { SearchInput } from "@/components/ui/search-input";
import { OptionSheet } from "@/components/ui/option-sheet";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useCollectionActions } from "@/features/collections/api/use-collection-actions";
import { useScanTarget } from "@/features/collections/api/use-scan-target";
import { orgOverviewQueryOptions } from "@/features/home/api/overview";
import { HomeCollectionRow } from "@/features/home/components/home-collection-row";
import { useAppStream } from "@/features/stream/api/use-app-stream";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePrefetchCollectionFirstPage } from "@/hooks/use-prefetch-collection-first-page";
import { usePricing } from "@/hooks/use-pricing";
import { useSession } from "@/lib/auth/session";
import { COLLECTION_SEARCH_MIN_COUNT } from "@/lib/constants/collections";
import { SPACING } from "@/lib/constants/theme";
import type { CollectionActionTarget } from "@/lib/interfaces/collections";
import type { LibraryViewProps } from "@/lib/interfaces/library";

export function CollectionsLibraryView({ title, viewSwitcher }: LibraryViewProps) {
  const { t } = useTranslation();
  const pricing = usePricing();
  const orgId = useActiveOrgId();
  const prefetchCollectionFirstPage = usePrefetchCollectionFirstPage();
  const { user } = useSession();
  const [search, setSearch] = useState("");
  const { locks } = useAppStream();
  const { collection: scanTarget, collections: allCollections, collectionsQuery } = useScanTarget();
  const isScreenFocused = useIsFocused();
  const overview = useQuery(orgOverviewQueryOptions(orgId, isScreenFocused));
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
    ? [pricing.format(overviewData.totalValue), t("collection.cardsCount", { count: overviewData.cardCount })].join(" · ")
    : null;
  const openNewCollection = () => router.push("/collection-new");

  return (
    <Screen
      refreshing={collectionsQuery.isRefetching || overview.isRefetching}
      onRefresh={() => {
        void collectionsQuery.refetch();
        void overview.refetch();
      }}
      header={
        <PageHeader
          title={title}
          subtitle={summary}
          actions={
            <View style={{ flexDirection: "row", gap: SPACING.sm }}>
              <IconButton icon="search" accessibilityLabel={t("search.open")} onPress={() => router.push("/search")} />
              {sorted.length > 0 ? (
                <IconButton icon="plus" variant="primary" accessibilityLabel={t("collections.new")} onPress={openNewCollection} />
              ) : null}
            </View>
          }
        >
          {viewSwitcher}
          {sorted.length > COLLECTION_SEARCH_MIN_COUNT ? (
            <SearchInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("home.searchPlaceholder")}
              accessibilityLabel={t("home.searchPlaceholder")}
            />
          ) : null}
        </PageHeader>
      }
    >
      {collectionsQuery.isError ? <Callout tone="destructive" title={t("collections.loadFailed")} /> : null}
      {collectionActions.empty.isError || collectionActions.remove.isError ? (
        <Callout
          tone="destructive"
          title={collectionActions.empty.isError ? t("collections.emptyFailed") : t("collections.deleteFailed")}
        />
      ) : null}

      {collectionsQuery.isPending ? (
        <ListSkeleton rows={3} />
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
                value={value != null ? pricing.format(value) : null}
                subtitle={[statusLabel, t("collection.cardsCount", { count: collection.cardCount })]
                  .filter(Boolean)
                  .join(" · ")}
                onPress={() => router.push({ pathname: "/collection/[guid]", params: { guid: collection.guid } })}
                onLongPress={() => setActionsCollection({ guid: collection.guid, name: collection.name })}
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
