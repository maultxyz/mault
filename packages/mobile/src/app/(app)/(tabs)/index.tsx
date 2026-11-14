import { useQuery } from "@tanstack/react-query";
import { valueChangeOf } from "@magic-vault/shared";
import { router, useIsFocused } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
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
import { HomeTopCardsList } from "@/features/home/components/home-top-cards-list";
import { ColumnChart } from "@/features/stats/components/column-chart";
import { useAppStream } from "@/features/stream/api/use-app-stream";
import { widgetSummaryQueryOptions } from "@/features/widgets/api/widget-summary";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import { HOME_CARD_OF_THE_DAY_TILE_WIDTH, HOME_SKELETON_HEIGHTS, HOME_TOP_CARDS_LIST_COUNT } from "@/lib/constants/home";
import { SPACING, SURFACE_RADIUS } from "@/lib/constants/theme";
import { WIDGET_ONE_DAY_MS } from "@/lib/constants/widgets";

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const pricing = usePricing();
  const orgId = useActiveOrgId();
  const { locks } = useAppStream();
  const isScreenFocused = useIsFocused();
  const isAnyScannerRunning = Object.keys(locks).length > 0;
  const overview = useQuery(orgOverviewQueryOptions(orgId, isScreenFocused));
  const summary = useQuery(widgetSummaryQueryOptions(orgId, isAnyScannerRunning));
  const collections = useQuery(collectionsQueryOptions(orgId));
  const locale = i18n.language;
  const numberFormat = new Intl.NumberFormat(locale);
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
      {overview.isError ? <Callout tone="destructive" title={t("home.loadFailed")} /> : null}

      {overview.isPending ? (
        <View style={{ gap: SPACING.lg + SPACING.xs }}>
          <Skeleton height={HOME_SKELETON_HEIGHTS.hero} radius={SURFACE_RADIUS} />
          <View style={{ gap: SPACING.sm }}>
            <Skeleton width="40%" height={20} />
            <Surface style={{ gap: SPACING.md }}>
              {Array.from({ length: HOME_TOP_CARDS_LIST_COUNT }).map((_, index) => (
                <Skeleton key={index} height={HOME_SKELETON_HEIGHTS.topCardRow} />
              ))}
            </Surface>
          </View>
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
            onPress={() => router.push("/stats")}
            accessibilityHint={t("home.hero.openStats")}
            stats={[
              { label: t("home.hero.cards"), value: numberFormat.format(overviewData.cardCount) },
              { label: t("home.hero.collections"), value: numberFormat.format(overviewData.collectionCount) },
              ...(summaryData
                ? [{ label: t("home.hero.scanned"), value: numberFormat.format(summaryData.scansAllTime) }]
                : []),
            ]}
          />

          {hasNoCollections ? (
            <Surface>
              <EmptyState
                icon="sparkles"
                title={t("home.welcome.title")}
                description={t("home.welcome.description")}
                action={<Button icon="plus" label={t("collections.new")} onPress={() => router.push("/collection-new")} />}
              />
            </Surface>
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

          <HomeTopCardsList
            title={t("home.topCards")}
            cards={overviewData.topCards.slice(0, HOME_TOP_CARDS_LIST_COUNT)}
            priceOf={(card) => (card.price != null ? pricing.format(card.price) : undefined)}
            action={{ label: t("home.seeAllStats"), onPress: () => router.push("/stats") }}
          />

          {summaryData && summaryData.all.cardsOfTheDay.length > 0 ? (
            <HomeCardRail
              title={t("home.cardOfTheDay")}
              cards={summaryData.all.cardsOfTheDay}
              tileWidth={HOME_CARD_OF_THE_DAY_TILE_WIDTH}
              captionOf={(card) => [card.price != null ? pricing.format(card.price) : null, card.collectionName].filter(Boolean).join(" · ")}
            />
          ) : null}

          {overviewData.cardCount > 0 ? (
            <View style={{ gap: SPACING.sm }}>
              <SectionHeader title={t("home.activity.title")} />
              <Surface style={{ gap: SPACING.md }}>
                <View style={{ flexDirection: "row", gap: SPACING.xl }}>
                  <HomeActivityFigure value={numberFormat.format(overviewData.scansToday)} label={t("home.activity.today")} />
                  <HomeActivityFigure
                    value={numberFormat.format(overviewData.scansByDay.reduce((sum, day) => sum + day.count, 0))}
                    label={t("home.activity.lastDays", { count: overviewData.scansByDay.length })}
                  />
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
            </View>
          ) : null}

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
