import { useQuery } from "@tanstack/react-query";
import { router, useIsFocused } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { DisplayHeadline } from "@/components/ui/display-headline";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { orgOverviewQueryOptions } from "@/features/home/api/overview";
import { HomeActivityFigure } from "@/features/home/components/home-activity-figure";
import { HomeCardRail } from "@/features/home/components/home-card-rail";
import { HomeHero } from "@/features/home/components/home-hero";
import { HomeHighlightRow } from "@/features/home/components/home-highlight-row";
import { HomeQuickActions } from "@/features/home/components/home-quick-actions";
import { greetingKeyFor } from "@/features/home/lib/greeting";
import { ColumnChart } from "@/features/stats/components/column-chart";
import { useAppStream } from "@/features/stream/api/use-app-stream";
import { widgetSummaryQueryOptions } from "@/features/widgets/api/widget-summary";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import { useSession } from "@/lib/auth/session";
import { HOME_CARD_OF_THE_DAY_TILE_WIDTH } from "@/lib/constants/home";
import { SPACING } from "@/lib/constants/theme";
import { WIDGET_ONE_DAY_MS } from "@/lib/constants/widgets";
import { valueChangeOf } from "@/lib/value-change";

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const pricing = usePricing();
  const orgId = useActiveOrgId();
  const { user } = useSession();
  const { locks } = useAppStream();
  const isScreenFocused = useIsFocused();
  const isAnyScannerRunning = Object.keys(locks).length > 0;
  const overview = useQuery(orgOverviewQueryOptions(orgId, isScreenFocused));
  const summary = useQuery(widgetSummaryQueryOptions(orgId, isAnyScannerRunning));
  const collections = useQuery(collectionsQueryOptions(orgId));
  const locale = i18n.language;
  const numberFormat = new Intl.NumberFormat(locale);
  const firstName = user?.name?.trim().split(/\s+/)[0];
  const greeting = t(greetingKeyFor(new Date()));
  const title = firstName ? t("home.greetingWithName", { greeting, name: firstName }) : greeting;
  const overviewData = overview.data;
  const summaryData = summary.data;
  const collectionNames = new Map((collections.data ?? []).map((collection) => [collection.guid, collection.name]));

  const change = summaryData ? valueChangeOf(summaryData.all, pricing.format, locale) : null;
  const previousDay = summaryData?.all.previousDay;
  const yesterday = new Date(Date.now() - WIDGET_ONE_DAY_MS).toISOString().slice(0, 10);
  const changeCaption = !previousDay
    ? ""
    : previousDay === yesterday
      ? t("home.hero.sinceYesterday")
      : t("home.hero.sinceDate", {
          date: new Date(`${previousDay}T00:00:00Z`).toLocaleDateString(locale, {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          }),
        });

  const reviewCount = summaryData?.review.needsReviewCount ?? 0;
  const firstReviewCard = summaryData?.review.cards[0];
  const scanActivityByCollection = new Map((summaryData?.scanActivity ?? []).map((activity) => [activity.collectionGuid, activity]));
  const liveScanners = Object.entries(locks);
  const hasNoCollections = overviewData?.collectionCount === 0;

  const refresh = () => {
    void overview.refetch();
    void summary.refetch();
    void collections.refetch();
  };

  return (
    <Screen
      refreshing={overview.isRefetching || summary.isRefetching}
      onRefresh={refresh}
      header={
        <PageHeader
          title={t("tabs.home")}
          actions={<IconButton icon="search" accessibilityLabel={t("search.open")} onPress={() => router.push("/search")} />}
        />
      }
    >
      <DisplayHeadline title={title} subtitle={t("home.subtitle")} />

      {overview.isError ? <Callout tone="destructive" title={t("home.loadFailed")} /> : null}

      {overview.isPending ? (
        <View style={{ gap: SPACING.lg }}>
          <Skeleton height={232} />
          <Skeleton height={96} />
          <Skeleton height={180} />
        </View>
      ) : overviewData ? (
        <>
          <HomeHero
            label={t("home.hero.value")}
            value={pricing.format(overviewData.totalValue)}
            change={change}
            changeCaption={changeCaption}
            sparklineValues={
              summaryData && summaryData.all.valueHistory.length >= 2
                ? summaryData.all.valueHistory.map((point) => point.totalValue)
                : overviewData.scansByDay.map((day) => day.count)
            }
            stats={[
              { label: t("home.hero.cards"), value: numberFormat.format(overviewData.cardCount) },
              { label: t("home.hero.collections"), value: numberFormat.format(overviewData.collectionCount) },
              ...(summaryData
                ? [{ label: t("home.hero.scanned"), value: numberFormat.format(summaryData.scansAllTime) }]
                : []),
            ]}
          />

          <HomeQuickActions
            actions={[
              { key: "scan", icon: "scan", label: t("home.actions.scan"), onPress: () => router.navigate("/scan"), isPrimary: true },
              { key: "new", icon: "plus", label: t("home.actions.newCollection"), onPress: () => router.push("/collection-new") },
              { key: "stats", icon: "stats", label: t("home.actions.stats"), onPress: () => router.push("/stats") },
            ]}
          />

          {hasNoCollections ? (
            <EmptyState
              icon="sparkles"
              title={t("home.welcome.title")}
              description={t("home.welcome.description")}
              action={<Button icon="plus" label={t("collections.new")} onPress={() => router.push("/collection-new")} />}
            />
          ) : null}

          {liveScanners.length > 0 || reviewCount > 0 ? (
            <View style={{ gap: SPACING.sm }}>
              {liveScanners.map(([collectionGuid, lock]) => {
                const activity = scanActivityByCollection.get(collectionGuid);
                return (
                  <HomeHighlightRow
                    key={collectionGuid}
                    icon="live"
                    tone="success"
                    title={t("home.live.title", {
                      name: lock.displayName,
                      collection: collectionNames.get(collectionGuid) ?? t("widgets.scanner.unknownCollection"),
                    })}
                    description={
                      activity
                        ? t("widgets.scanner.progress", {
                            count: activity.sessionScanCount,
                            rate: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(activity.scansPerMinute),
                          })
                        : t("home.live.scanning")
                    }
                    actionLabel={t("home.live.open")}
                    onPress={() => router.push({ pathname: "/collection/[guid]", params: { guid: collectionGuid } })}
                  />
                );
              })}
              {reviewCount > 0 ? (
                <HomeHighlightRow
                  icon="help"
                  tone="warning"
                  title={t("home.review.title", { count: reviewCount })}
                  description={t("home.review.description")}
                  actionLabel={t("home.review.open")}
                  onPress={() =>
                    firstReviewCard
                      ? router.push({ pathname: "/review-grid", params: { guid: firstReviewCard.collectionGuid } })
                      : router.navigate("/collections")
                  }
                />
              ) : null}
            </View>
          ) : null}

          {summaryData && summaryData.all.cardsOfTheDay.length > 0 ? (
            <HomeCardRail
              title={t("home.cardOfTheDay")}
              cards={summaryData.all.cardsOfTheDay}
              tileWidth={HOME_CARD_OF_THE_DAY_TILE_WIDTH}
              captionOf={(card) => [card.price != null ? pricing.format(card.price) : null, card.collectionName].filter(Boolean).join(" · ")}
            />
          ) : null}

          {overviewData.cardCount > 0 ? (
            <Surface style={{ gap: SPACING.md }}>
              <SectionHeader title={t("home.activity.title")} />
              <View style={{ flexDirection: "row", gap: SPACING.xl }}>
                <HomeActivityFigure value={numberFormat.format(overviewData.scansToday)} label={t("home.activity.today")} />
                <HomeActivityFigure value={numberFormat.format(overviewData.scansThisWeek)} label={t("home.activity.thisWeek")} />
              </View>
              <ColumnChart
                data={overviewData.scansByDay.map((day) => ({
                  key: day.date,
                  label: new Date(`${day.date}T00:00:00Z`).toLocaleDateString(locale, {
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  }),
                  value: day.count,
                }))}
                formatValue={(value) => t("home.activity.scans", { count: value })}
                accessibilityLabel={t("home.activity.chartLabel")}
              />
            </Surface>
          ) : null}

          <HomeCardRail
            title={t("home.topCards")}
            cards={overviewData.topCards}
            captionOf={(card) => (card.price != null ? pricing.format(card.price) : card.collectionName)}
            action={{ label: t("home.seeAllStats"), onPress: () => router.push("/stats") }}
          />

          <HomeCardRail
            title={t("home.recentScans")}
            cards={overviewData.recentCards}
            captionOf={(card) => card.collectionName}
          />
        </>
      ) : null}
    </Screen>
  );
}
