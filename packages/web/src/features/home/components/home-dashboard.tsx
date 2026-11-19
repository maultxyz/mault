import { Callout } from "@/components/callout";
import { CompactCount, CompactPrice } from "@/components/compact-value";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { orgOverviewQueryOptions } from "@/features/collections/api/org-overview";
import { useCollections } from "@/features/collections/api/use-collections";
import { CreateCollectionDialog } from "@/features/collections/components/create-collection-dialog";
import { useOrg } from "@/features/companies/api/use-organization";
import { widgetSummaryQueryOptions } from "@/features/home/api/widget-summary";
import { HomeCardRail } from "@/features/home/components/home-card-rail";
import { HomeHighlightRow } from "@/features/home/components/home-highlight-row";
import { usePendingTradeOffers } from "@/features/trade-offers/api/trade-offers";
import { ColumnChart } from "@/features/stats/components/column-chart";
import { ValueHero } from "@/features/stats/components/value-hero";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { usePriceSource } from "@/hooks/use-price-source";
import { useCollectionLocks } from "@/lib/app-stream";
import { CARD_REVIEW_SEARCH_PARAM } from "@/lib/constants/cards";
import { collectionViewPath, monitorCollectionPath } from "@/lib/constants/collections";
import { HOME_CARD_OF_THE_DAY_TILE_CLASS } from "@/lib/constants/home";
import { MOBILE_SCAN_PATH } from "@/lib/constants/nav";
import { SCANNER_PATH, monitorCollectionReviewPath } from "@/lib/constants/scanner";
import { STATS_PATH } from "@/lib/constants/stats";
import { TRADES_PATH, tradeOfferPath } from "@/lib/constants/trade-offers";
import { ONE_DAY_MS } from "@/lib/constants/timing";
import { cardPriceChangeSinceScanOf, valueChangeOf, type OrgOverviewCard } from "@magic-vault/shared";
import {
  IconAlbum,
  IconAlertTriangle,
  IconArrowsExchange,
  IconBroadcast,
  IconHelpCircle,
  IconPlus,
  IconScan,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

function formatDay(date: string, locale: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" });
}

export function HomeDashboard() {
  const { t, i18n } = useTranslation("home");
  const { activeOrg } = useOrg();
  const { format } = usePriceSource();
  const isMobile = useIsMobile();
  const { locks } = useCollectionLocks();
  const { collections } = useCollections();
  const overview =useQuery(orgOverviewQueryOptions(activeOrg?.id));
  const summary = useQuery(widgetSummaryQueryOptions(activeOrg?.id));
  const pendingTradeOffers = usePendingTradeOffers();
  const locale = i18n.language;
  const overviewData = overview.data;
  const summaryData = summary.data;
  const collectionPath = (guid: string) => (isMobile ? monitorCollectionPath(guid) : collectionViewPath(guid));
  const isFirstRun = !overview.isError && overviewData?.collectionCount === 0 && collections.length === 0;

  const change = summaryData ? valueChangeOf(summaryData.all, format, locale) : null;
  const previousDay = summaryData?.all.previousDay;
  const yesterday = new Date(Date.now() - ONE_DAY_MS).toISOString().slice(0, 10);
  const changeCaption = !previousDay
    ? ""
    : previousDay === yesterday
      ? t("hero.sinceYesterday")
      : t("hero.sinceDate", { date: formatDay(previousDay, locale) });
  const reviewCount = summaryData?.review.needsReviewCount ?? 0;
  const firstReviewCard = summaryData?.review.cards[0];
  const liveCollections = Object.entries(locks);
  const cardOfTheDayPriceChange = (card: OrgOverviewCard) => cardPriceChangeSinceScanOf(card, format, locale);
  const cardOfTheDayCaption = (card: OrgOverviewCard) => {
    const price = card.price != null ? format(card.price) : null;
    return cardOfTheDayPriceChange(card)
      ? (price ?? "")
      : [price, card.collectionName].filter(Boolean).join(" · ");
  };
  const collectionNames = new Map(collections.map((collection) => [collection.guid, collection.name]));

  return (
    <div className="flex flex-col gap-6 md:gap-2">
      {overview.isError && (
        <Callout
          variant="error"
          icon={IconAlertTriangle}
          action={
            <Button variant="outline" onClick={() => void overview.refetch()}>
              {t("common:a11y.retry")}
            </Button>
          }
        >
          {t("loadFailed")}
        </Callout>
      )}

      {overview.isPending ? (
        <Skeleton className="h-60 rounded-card" />
      ) : overviewData ? (
        <>
          <ValueHero
            label={t("hero.value")}
            value={
              <CompactPrice
                value={overviewData.totalValue}
                compactsOnlyBelowMd
              />
            }
            change={change ? { change, caption: changeCaption } : null}
            sparklineValues={
              summaryData && summaryData.all.valueHistory.length >= 2
                ? summaryData.all.valueHistory.map((point) => point.totalValue)
                : overviewData.scansByDay.map((day) => day.count)
            }
            stats={[
              {
                label: t("hero.cards"),
                value: <CompactCount value={overviewData.cardCount} />,
              },
              {
                label: t("hero.collections"),
                value: <CompactCount value={overviewData.collectionCount} />,
              },
              ...(summaryData
                ? [
                    {
                      label: t("hero.scanned"),
                      value: <CompactCount value={summaryData.scansAllTime} />,
                    },
                  ]
                : []),
            ]}
          />
          {(liveCollections.length > 0 || reviewCount > 0 || pendingTradeOffers.length > 0) && (
            <div className="flex flex-col gap-2 md:gap-1.5">
              {liveCollections.map(([guid, lock]) => (
                <HomeHighlightRow
                  key={guid}
                  icon={IconBroadcast}
                  tone="success"
                  title={
                    collectionNames.has(guid)
                      ? t("live.title", { name: lock.displayName, collection: collectionNames.get(guid) })
                      : t("live.scanningBy", { name: lock.displayName })
                  }
                  description={t("live.scanning")}
                  to={collectionPath(guid)}
                />
              ))}
              {reviewCount > 0 && firstReviewCard && (
                <HomeHighlightRow
                  icon={IconHelpCircle}
                  tone="warning"
                  title={t("review.title", { count: reviewCount })}
                  description={t("review.description")}
                  to={
                    isMobile
                      ? monitorCollectionReviewPath(firstReviewCard.collectionGuid)
                      : `${collectionViewPath(firstReviewCard.collectionGuid)}?${CARD_REVIEW_SEARCH_PARAM}=1`
                  }
                />
              )}
              {pendingTradeOffers.length > 0 && (
                <HomeHighlightRow
                  icon={IconArrowsExchange}
                  tone="primary"
                  title={t("trades.title", { count: pendingTradeOffers.length })}
                  description={t("trades.description")}
                  to={pendingTradeOffers.length === 1 ? tradeOfferPath(pendingTradeOffers[0].guid) : TRADES_PATH}
                />
              )}
            </div>
          )}

          {isFirstRun && (
            <div className="rounded-card bg-card px-4">
              <EmptyState
                icon={IconAlbum}
                title={t("firstRun.title")}
                titleAs="h2"
                description={t("firstRun.description")}
                action={
                  <div className="flex flex-wrap justify-center gap-1.5">
                    <CreateCollectionDialog
                      trigger={({ disabled }) => (
                        <Button disabled={disabled}>
                          <IconPlus />
                          {t("firstRun.createCollection")}
                        </Button>
                      )}
                    />
                    <Button
                      variant="outline"
                      nativeButton={false}
                      render={<Link to={isMobile ? MOBILE_SCAN_PATH : SCANNER_PATH} />}
                    >
                      <IconScan />
                      {t("firstRun.startScanning")}
                    </Button>
                  </div>
                }
              />
            </div>
          )}

          {(summary.isPending || summaryData) && (
            <HomeCardRail
              title={t("cardOfTheDay")}
              cards={summaryData?.all.cardsOfTheDay ?? []}
              isLoading={summary.isPending}
              tileClassName={HOME_CARD_OF_THE_DAY_TILE_CLASS}
              captionOf={cardOfTheDayCaption}
              priceChangeOf={cardOfTheDayPriceChange}
            />
          )}

          {overviewData.cardCount > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="font-heading text-base font-semibold text-foreground md:text-sm">{t("activity.title")}</h2>
              <div className="flex flex-col gap-4 md:gap-2 rounded-card bg-card p-5 md:p-2.5">
                <dl className="flex gap-8">
                  <div className="flex flex-col-reverse">
                    <dt className="text-xs text-foreground/70">
                      {t("activity.today")}
                    </dt>
                    <dd className="text-2xl font-bold tabular-nums text-foreground">
                      <CompactCount value={overviewData.scansToday} />
                    </dd>
                  </div>
                  <div className="flex flex-col-reverse">
                    <dt className="text-xs text-foreground/70">
                      {t("activity.thisWeek")}
                    </dt>
                    <dd className="text-2xl font-bold tabular-nums text-foreground">
                      <CompactCount value={overviewData.scansThisWeek} />
                    </dd>
                  </div>
                </dl>
                <ColumnChart
                  ariaLabel={t("activity.chartLabel")}
                  data={overviewData.scansByDay.map((day) => ({
                    key: day.date,
                    label: formatDay(day.date, locale),
                    value: day.count,
                  }))}
                  formatValue={(value) => t("activity.scans", { count: value })}
                  endLabel={t("activity.today")}
                />
              </div>
            </section>
          )}

          <HomeCardRail
            title={t("topCards")}
            cards={overviewData.topCards}
            captionOf={(card) => (card.price != null ? format(card.price) : card.collectionName)}
            action={{ label: t("seeAllStats"), to: STATS_PATH }}
          />
          <HomeCardRail
            title={t("recentScans")}
            cards={overviewData.recentCards}
            captionOf={(card) => card.collectionName}
          />
        </>
      ) : null}
    </div>
  );
}
