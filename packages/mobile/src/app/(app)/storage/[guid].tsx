import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, View } from "react-native";
import { allExportAdapters, buildExportCsv, exportFilename, supportsGame, type ExportAdapter } from "@magic-vault/shared";
import { CardRow } from "@/components/cards/card-row";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteStorageLocation,
  fetchFirstUnreviewedStorageCard,
  storageLocationCardsPageQueryOptions,
  storageLocationExportQueryOptions,
  storageLocationQueryOptions,
} from "@/features/storage/api/storage";
import { ExportSheet } from "@/features/cards/components/export-sheet";
import { shareCsv } from "@/features/cards/lib/share-csv";
import { gamesQueryOptions } from "@/features/games/api/games";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import { LIST_END_THRESHOLD } from "@/lib/constants/collections";
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
  const { data: location } = useQuery(storageLocationQueryOptions(guid));
  const cards = useInfiniteQuery(storageLocationCardsPageQueryOptions(guid));
  const items = useMemo(() => cards.data?.pages.flatMap((page) => page.cards) ?? [], [cards.data]);
  const [exportOpen, setExportOpen] = useState(false);
  const [combineDuplicates, setCombineDuplicates] = useState(true);
  const [notice, setNotice] = useState<{ tone: "info" | "destructive"; text: string } | null>(null);
  const exportCards = useQuery(storageLocationExportQueryOptions(guid, exportOpen));
  const { data: games = [] } = useQuery(gamesQueryOptions);
  const gameKeys = useMemo(
    () => [...new Set((exportCards.data ?? []).map((entry) => entry.gameKey ?? undefined))],
    [exportCards.data],
  );
  const adapters = useMemo(
    () => allExportAdapters.filter((adapter) => gameKeys.every((key) => supportsGame(adapter, key))),
    [gameKeys],
  );
  const singleGameKey = gameKeys.length === 1 ? gameKeys[0] : undefined;

  const runExport = useMutation({
    mutationFn: async (adapter: ExportAdapter) => {
      const entries = exportCards.data ?? [];
      if (entries.length === 0) return;
      const fieldDefinitions = games.find((game) => game.key === singleGameKey)?.fieldDefinitions ?? [];
      const csv = buildExportCsv(
        adapter,
        entries.map((entry) => ({
          card: entry.card,
          isFoil: entry.isFoil,
          foilType: entry.foilType ?? undefined,
          condition: entry.condition,
        })),
        {
          isMtg: singleGameKey === "mtg",
          fieldDefinitions,
          gameKey: singleGameKey,
          gameName: games.find((game) => game.key === singleGameKey)?.name,
        },
        combineDuplicates,
      );
      const slug = (location?.name ?? "storage").replace(/\s+/g, "-").toLowerCase();
      await shareCsv(csv, exportFilename(adapter, slug));
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
          }
        />
      }
    >
      <FlatList
        style={{ marginHorizontal: -SPACING.sm }}
        data={items}
        keyExtractor={(entry) => entry.scanId}
        contentContainerStyle={{ paddingBottom: SPACING.xxl }}
        onEndReachedThreshold={LIST_END_THRESHOLD}
        onEndReached={() => {
          if (cards.hasNextPage && !cards.isFetchingNextPage) void cards.fetchNextPage();
        }}
        refreshControl={
          <RefreshControl
            refreshing={cards.isRefetching && !cards.isFetchingNextPage}
            onRefresh={() => void cards.refetch()}
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
                <Button style={{ flex: 1 }} icon="check" label={t("storage.review.start")} onPress={() => void startReview()} />
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
          </View>
        }
        ListEmptyComponent={
          cards.isPending ? (
            <View style={{ gap: SPACING.sm, paddingHorizontal: SPACING.sm }}>
              <Skeleton height={61} />
              <Skeleton height={61} />
            </View>
          ) : (
            <EmptyState icon="collections" title={t("storage.noCardsTitle")} />
          )
        }
        ListFooterComponent={
          cards.isFetchingNextPage ? <ActivityIndicator style={{ margin: SPACING.lg }} color={colors.primaryText} /> : undefined
        }
        renderItem={({ item: entry }) => {
          const value = pricing.priceOf(entry.card, entry.isFoil, entry.condition);
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
      <ExportSheet
        visible={exportOpen}
        title={t("export.title", { name: location?.name ?? "" })}
        adapters={adapters}
        loading={exportCards.isPending}
        exporting={runExport.isPending}
        failed={runExport.isError || exportCards.isError}
        combineDuplicates={combineDuplicates}
        onCombineDuplicatesChange={setCombineDuplicates}
        onExport={(adapter) => runExport.mutate(adapter)}
        onClose={() => setExportOpen(false)}
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
