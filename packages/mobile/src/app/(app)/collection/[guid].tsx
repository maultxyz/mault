import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, FlatList, RefreshControl, useWindowDimensions, View } from "react-native";
import { CardTile } from "@/components/cards/card-tile";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { TabStrip } from "@/components/ui/tab-strip";
import {
  collectionCardsQueryOptions,
  collectionCardsSummaryQueryOptions,
} from "@/features/collections/api/collection-cards";
import {
  collectionsQueryOptions,
  deleteCollection,
  emptyCollection,
  setActiveCollection,
} from "@/features/collections/api/collections";
import { CollectionActivity } from "@/features/collections/components/collection-activity";
import { useSessionStream } from "@/features/monitor/api/use-session-stream";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import {
  CARD_ASPECT_RATIO,
  CARD_GRID_COLUMNS,
  CARD_GRID_GAP_X,
  CARD_GRID_GAP_Y,
  CARD_GRID_GUTTER,
  LIST_END_THRESHOLD,
  SEARCH_DEBOUNCE_MS,
} from "@/lib/constants/collections";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { CollectionTab } from "@/lib/interfaces/collections";
import { absoluteUrl } from "@/lib/url";

export default function CollectionScreen() {
  const { guid } = useLocalSearchParams<{ guid: string }>();
  const { t } = useTranslation();
  const colors = useTheme();
  const pricing = usePricing();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<CollectionTab>("cards");
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const collectionsOptions = collectionsQueryOptions(useActiveOrgId());
  const { data: collections } = useQuery(collectionsOptions);
  const collection = collections?.find((c) => c.guid === guid);
  const cards = useInfiniteQuery(collectionCardsQueryOptions(guid, debounced));
  const summary = useQuery(collectionCardsSummaryQueryOptions(guid));
  const stream = useSessionStream(guid);
  const makeActive = useMutation({
    mutationFn: setActiveCollection,
    onSuccess: (next) => queryClient.setQueryData(collectionsOptions.queryKey, next),
  });
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
    } else if (action === "delete") {
      Alert.alert(t("collections.delete"), t("collections.deleteDescription", { name }), [
        { text: t("collections.cancel"), style: "cancel" },
        { text: t("collections.deleteConfirm"), style: "destructive", onPress: () => remove.mutate() },
      ]);
    }
  };

  const items = useMemo(() => cards.data?.pages.flatMap((page) => page.items) ?? [], [cards.data]);
  const totalCards = cards.data?.pages[0]?.totalCards ?? collection?.cardCount ?? 0;
  const stats = summary.data?.all;
  const hasPricing = !!stats && stats.priceableCount > 0;
  const tileWidth = (width - CARD_GRID_GUTTER * 2 - CARD_GRID_GAP_X * (CARD_GRID_COLUMNS - 1)) / CARD_GRID_COLUMNS;
  const alertCount = stream.unmatchedCount + stream.errors.length;
  const statusColor =
    stream.status === "connected" ? colors.success : stream.status === "error" ? colors.destructive : colors.warning;

  const openCard = (scanId: string) => router.push({ pathname: "/card/[scanId]", params: { scanId, guid } });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={collection?.name ?? t("collections.title")}
        subtitle={[t(`monitor.status.${stream.status}`), collection?.game?.name].filter(Boolean).join(" · ")}
        subtitleAccessory={
          <View style={{ width: 8, height: 8, borderRadius: RADIUS.full, backgroundColor: statusColor }} />
        }
        onBack={() => router.back()}
        actions={
          collection ? (
            <IconButton icon="more" accessibilityLabel={t("collections.actions")} onPress={() => setActionsOpen(true)} />
          ) : null
        }
      >
        <View style={{ gap: 2 }}>
          <AppText size="sm" tone="secondary" weight="medium">
            {hasPricing ? t("collection.value") : t("collection.cards")}
          </AppText>
          <AppText size="4xl" heading weight="bold" numberOfLines={1} adjustsFontSizeToFit style={{ fontVariant: ["tabular-nums"] }}>
            {hasPricing && stats ? pricing.format(stats.totalValue) : String(totalCards)}
          </AppText>
          <AppText size="sm" tone="secondary" style={{ fontVariant: ["tabular-nums"] }}>
            {[
              hasPricing ? t("collection.cardsCount", { count: totalCards }) : null,
              stats ? t("collection.unique", { count: stats.uniqueCount }) : null,
            ]
              .filter(Boolean)
              .join(" · ") || " "}
          </AppText>
        </View>
        {collection && !collection.isActive ? (
          <Button
            icon="scan"
            label={t("collections.makeActive")}
            loading={makeActive.isPending}
            onPress={() => makeActive.mutate(guid)}
          />
        ) : null}
      </PageHeader>

      <TabStrip<CollectionTab>
        value={tab}
        onChange={setTab}
        items={[
          { value: "cards", label: t("collection.tabCards") },
          { value: "activity", label: t("collection.tabActivity"), badge: alertCount },
        ]}
      />

      {empty.isError || remove.isError ? (
        <View style={{ paddingHorizontal: CARD_GRID_GUTTER, paddingTop: SPACING.md }}>
          <Callout tone="destructive" title={empty.isError ? t("collections.emptyFailed") : t("collections.deleteFailed")} />
        </View>
      ) : null}
      <OptionSheet
        visible={actionsOpen}
        title={collection?.name ?? t("collections.actions")}
        options={[
          { value: "rename", label: t("collections.rename") },
          { value: "empty", label: t("collections.empty") },
          { value: "delete", label: t("collections.delete") },
        ]}
        selected={[]}
        onSelect={runAction}
        onClose={() => setActionsOpen(false)}
      />

      {makeActive.isError ? (
        <View style={{ paddingHorizontal: CARD_GRID_GUTTER, paddingTop: SPACING.md }}>
          <Callout tone="destructive" title={t("collections.activateFailed")} />
        </View>
      ) : null}

      {tab === "activity" ? (
        <CollectionActivity state={stream} onOpen={openCard} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.scanId}
          numColumns={CARD_GRID_COLUMNS}
          keyboardShouldPersistTaps="handled"
          columnWrapperStyle={{ gap: CARD_GRID_GAP_X }}
          contentContainerStyle={{ paddingHorizontal: CARD_GRID_GUTTER, paddingBottom: SPACING.xxl, gap: CARD_GRID_GAP_Y }}
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
            <View style={{ gap: SPACING.md, paddingTop: SPACING.lg }}>
              <SearchInput
                value={search}
                onChangeText={setSearch}
                placeholder={t("collection.searchPlaceholder")}
                accessibilityLabel={t("collections.search")}
              />
              {cards.isError ? <Callout tone="destructive" title={t("collections.cardsLoadFailed")} /> : null}
            </View>
          }
          ListEmptyComponent={
            cards.isPending ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: CARD_GRID_GAP_X, rowGap: CARD_GRID_GAP_Y }}>
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} width={tileWidth} height={tileWidth / CARD_ASPECT_RATIO} radius={RADIUS.lg} />
                ))}
              </View>
            ) : (
              <EmptyState
                icon={debounced ? "search" : "collections"}
                title={debounced ? t("collection.noMatches") : t("collection.noCardsYet")}
              />
            )
          }
          ListFooterComponent={
            cards.isFetchingNextPage ? <ActivityIndicator style={{ margin: SPACING.lg }} color={colors.primaryText} /> : null
          }
          renderItem={({ item }) => {
            const price = pricing.priceOf(item.card, item.isFoil, item.condition);
            const flagged = !!item.lowConfidenceMatch || !!item.alternativeMatches?.length;
            return (
              <View style={{ width: tileWidth }}>
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
                />
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
