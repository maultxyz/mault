import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { STATS_DEFAULT_RANGE, STATS_RANGES, type StatsRange } from "@magic-vault/shared";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { PickerCard } from "@/components/ui/picker-card";
import { Screen } from "@/components/ui/screen";
import { TabStrip } from "@/components/ui/tab-strip";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { statsQueryOptions } from "@/features/stats/api/stats";
import { StatsDashboard } from "@/features/stats/components/stats-dashboard";
import { StatsDashboardSkeleton } from "@/features/stats/components/stats-dashboard-skeleton";
import { StatsLeaderboardSheet } from "@/features/stats/components/stats-leaderboard-sheet";
import { useActiveOrg } from "@/hooks/use-org";
import { STATS_ALL_COLLECTIONS } from "@/lib/constants/stats";
import { SPACING } from "@/lib/constants/theme";

export default function StatsScreen() {
  const { t } = useTranslation();
  const org = useActiveOrg();
  const orgId = org?.id ?? null;
  const [range, setRange] = useState<StatsRange>(STATS_DEFAULT_RANGE);
  const { collection: initialCollectionGuid } = useLocalSearchParams<{ collection?: string }>();
  const [collectionGuid, setCollectionGuid] = useState<string | null>(initialCollectionGuid ?? null);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const collections = useQuery(collectionsQueryOptions(orgId));
  const { data: report, isPending, isError, refetch, isRefetching } = useQuery(
    statsQueryOptions(orgId, range, collectionGuid),
  );
  const selected = collections.data?.find((c) => c.guid === collectionGuid);

  return (
    <Screen
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
      header={
        <PageHeader
          title={t("stats.title")}
          onBack={() => router.back()}
          actions={
            <IconButton
              icon="trophy"
              accessibilityLabel={t("stats.leaderboard.title")}
              onPress={() => setLeaderboardOpen(true)}
            />
          }
        />
      }
    >
      <View style={{ gap: SPACING.sm }}>
        <PickerCard
          icon="collections"
          label={t("stats.controls.collection")}
          value={selected?.name ?? t("stats.controls.allCollections")}
          placeholder={t("stats.controls.allCollections")}
          onPress={() => setCollectionsOpen(true)}
        />
        <TabStrip<StatsRange>
          inline
          value={range}
          onChange={setRange}
          items={STATS_RANGES.map((value) => ({ value, label: t(`stats.controls.ranges.${value}`) }))}
        />
      </View>

      {isError ? (
        <Callout tone="destructive" title={t("stats.error")} />
      ) : isPending || !report ? (
        <StatsDashboardSkeleton />
      ) : report.totals.cardCount === 0 ? (
        <EmptyState icon="stats" title={t("stats.empty.title")} description={t("stats.empty.description")} />
      ) : (
        <StatsDashboard report={report} onSelectCollection={setCollectionGuid} />
      )}

      <OptionSheet
        visible={collectionsOpen}
        title={t("stats.controls.collection")}
        options={[
          { value: STATS_ALL_COLLECTIONS, label: t("stats.controls.allCollections") },
          ...(collections.data ?? []).map((c) => ({ value: c.guid, label: c.name })),
        ]}
        selected={[collectionGuid ?? STATS_ALL_COLLECTIONS]}
        onSelect={(value) => {
          setCollectionGuid(value === STATS_ALL_COLLECTIONS ? null : value);
          setCollectionsOpen(false);
        }}
        onClose={() => setCollectionsOpen(false)}
      />
      <StatsLeaderboardSheet visible={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} />
    </Screen>
  );
}
