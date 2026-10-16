import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import type { OrgOverviewCard } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import { QuickAction } from "@/components/ui/quick-action";
import { Screen } from "@/components/ui/screen";
import { SearchInput } from "@/components/ui/search-input";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { orgOverviewQueryOptions } from "@/features/home/api/overview";
import { ActivityChart } from "@/features/home/components/activity-chart";
import { CardStrip } from "@/features/home/components/card-strip";
import { HomeCollectionRow } from "@/features/home/components/home-collection-row";
import { HomeHero } from "@/features/home/components/home-hero";
import { HomeStatTile } from "@/features/home/components/home-stat-tile";
import { useAppAlerts } from "@/features/stream/api/use-app-alerts";
import { useAppStream } from "@/features/stream/api/use-app-stream";
import { AlertsBell } from "@/features/stream/components/alerts-bell";
import { AlertsSheet } from "@/features/stream/components/alerts-sheet";
import { useActiveOrg } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import { useSession } from "@/lib/auth/session";
import { SPACING } from "@/lib/constants/theme";
import { formatShortDate } from "@/lib/dates";

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const pricing = usePricing();
  const org = useActiveOrg();
  const { user } = useSession();
  const orgId = org?.id ?? null;
  const [search, setSearch] = useState("");
  const [alertsOpen, setAlertsOpen] = useState(false);
  const alerts = useAppAlerts();
  const { locks } = useAppStream();
  const collections = useQuery(collectionsQueryOptions(orgId));
  const overview = useQuery(orgOverviewQueryOptions(orgId));
  const firstName = user?.name?.trim().split(/\s+/)[0];
  const number = (value: number) => value.toLocaleString(i18n.language);

  const sorted = useMemo(
    () =>
      [...(collections.data ?? [])].sort((a, b) => {
        const aLive = !!locks[a.guid];
        const bLive = !!locks[b.guid];
        if (aLive !== bLive) return aLive ? -1 : 1;
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }),
    [collections.data, locks],
  );
  const query = search.trim().toLowerCase();
  const filtered = query ? sorted.filter((c) => c.name.toLowerCase().includes(query)) : sorted;

  const openCard = (entry: OrgOverviewCard) =>
    router.push({ pathname: "/card/[scanId]", params: { scanId: entry.scanId, guid: entry.collectionGuid } });

  const data = overview.data;

  return (
    <Screen
      refreshing={collections.isRefetching || overview.isRefetching}
      onRefresh={() => {
        void collections.refetch();
        void overview.refetch();
      }}
      header={
        <PageHeader
          title={firstName ? t("home.greeting", { name: firstName }) : t("home.greetingNoName")}
          subtitle={org?.name}
          actions={<AlertsBell count={alerts.length} onPress={() => setAlertsOpen(true)} />}
        />
      }
    >
      <HomeHero
        value={data ? pricing.format(data.totalValue) : null}
        summary={
          data
            ? [t("collection.cardsCount", { count: data.cardCount }), t("home.collectionCount", { count: data.collectionCount })].join(" · ")
            : null
        }
      />

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <QuickAction icon="scan" label={t("home.actions.scan")} onPress={() => router.navigate("/scan")} />
        <QuickAction icon="plus" label={t("home.actions.newCollection")} onPress={() => router.push("/collection-new")} />
        <QuickAction icon="sorter" label={t("home.actions.sorter")} onPress={() => router.push("/sorter")} />
        <QuickAction icon="stats" label={t("home.actions.stats")} onPress={() => router.push("/stats")} />
      </View>

      {collections.isError ? <Callout tone="destructive" title={t("collections.loadFailed")} /> : null}

      {overview.isPending ? (
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          <Skeleton width="31%" height={64} />
          <Skeleton width="31%" height={64} />
          <Skeleton width="31%" height={64} />
        </View>
      ) : data ? (
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          <HomeStatTile label={t("home.scannedToday")} value={number(data.scansToday)} />
          <HomeStatTile label={t("home.thisWeek")} value={number(data.scansThisWeek)} />
          <HomeStatTile label={t("home.collections")} value={number(data.collectionCount)} />
        </View>
      ) : null}

      <View style={{ gap: SPACING.sm }}>
        <SectionHeader
          title={t("home.allCollections")}
          action={
            sorted.length > 0 ? (
              <IconButton icon="plus" size={36} accessibilityLabel={t("collections.new")} onPress={() => router.push("/collection-new")} />
            ) : null
          }
        />
        {sorted.length > 5 ? (
          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder={t("home.searchPlaceholder")}
            accessibilityLabel={t("home.searchPlaceholder")}
          />
        ) : null}
        {collections.isPending ? (
          <View style={{ gap: SPACING.sm }}>
            <Skeleton height={56} />
            <Skeleton height={56} />
            <Skeleton height={56} />
          </View>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon="collections"
            title={t("collections.emptyTitle")}
            description={t("collections.createDescription")}
            action={<Button icon="plus" label={t("collections.new")} onPress={() => router.push("/collection-new")} />}
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon="search" title={t("home.noSearchResultsTitle")} description={t("home.noSearchResultsDescription")} />
        ) : (
          <ListGroup>
            {filtered.map((collection) => {
              const value = data?.collectionValues[collection.guid];
              const lock = locks[collection.guid];
              const liveLabel = lock
                ? lock.userId === user?.id
                  ? t("home.live.yourSession")
                  : t("home.live.scanningBy", { name: lock.displayName })
                : null;
              return (
                <HomeCollectionRow
                  key={collection.guid}
                  name={collection.name}
                  isActive={collection.isActive}
                  isLive={!!lock}
                  value={value != null ? pricing.format(value) : null}
                  subtitle={[
                    liveLabel ?? (collection.isActive ? t("collections.active") : null),
                    t("collection.cardsCount", { count: collection.cardCount }),
                    formatShortDate(collection.updatedAt, i18n.language),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  onPress={() => router.push({ pathname: "/collection/[guid]", params: { guid: collection.guid } })}
                />
              );
            })}
          </ListGroup>
        )}
      </View>

      {data && !query ? (
        <>
          {data.scansByDay.length > 1 ? (
            <View style={{ gap: SPACING.sm }}>
              <SectionHeader
                title={t("home.activityTitle")}
                action={
                  <Pressable accessibilityRole="link" hitSlop={SPACING.sm} onPress={() => router.push("/stats")}>
                    <AppText size="sm" weight="semibold" tone="primary">
                      {t("home.seeAllStats")}
                    </AppText>
                  </Pressable>
                }
              />
              <ActivityChart days={data.scansByDay} />
            </View>
          ) : null}
          <CardStrip title={t("home.mostValuable")} cards={data.topCards} onOpen={openCard} />
          <CardStrip title={t("home.recentlyScanned")} cards={data.recentCards} onOpen={openCard} />
        </>
      ) : null}
      <AlertsSheet visible={alertsOpen} alerts={alerts} onClose={() => setAlertsOpen(false)} />
    </Screen>
  );
}
