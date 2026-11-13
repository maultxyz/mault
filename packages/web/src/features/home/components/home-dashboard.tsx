import { Callout } from "@/components/callout";
import { DisplayHeadline } from "@/components/display-headline";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { orgOverviewQueryOptions } from "@/features/collections/api/org-overview";
import { CreateCollectionDialog } from "@/features/collections/components/create-collection-dialog";
import { useOrg } from "@/features/companies/api/use-organization";
import { widgetSummaryQueryOptions } from "@/features/home/api/widget-summary";
import { HomeCardRail } from "@/features/home/components/home-card-rail";
import { HomeHighlightRow } from "@/features/home/components/home-highlight-row";
import { HomeQuickActions } from "@/features/home/components/home-quick-actions";
import { ColumnChart } from "@/features/stats/components/column-chart";
import { ValueHero } from "@/features/stats/components/value-hero";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { usePiHost } from "@/hooks/use-pi-host";
import { usePriceSource } from "@/hooks/use-price-source";
import { useCollectionLocks } from "@/lib/app-stream";
import { useAuthSession } from "@/lib/auth";
import { CARD_REVIEW_SEARCH_PARAM } from "@/lib/constants/cards";
import { collectionViewPath, monitorCollectionPath } from "@/lib/constants/collections";
import { HOME_CARD_OF_THE_DAY_TILE_CLASS } from "@/lib/constants/home";
import { MOBILE_SCAN_PATH } from "@/lib/constants/nav";
import { STATS_PATH } from "@/lib/constants/stats";
import { ONE_DAY_MS } from "@/lib/constants/timing";
import { isRemoteBrowser } from "@/lib/host";
import { greetingPeriodFor, valueChangeOf } from "@magic-vault/shared";
import { IconAlertTriangle, IconBroadcast, IconChartBar, IconHelpCircle, IconPlus, IconScan, IconSparkles } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

function formatDay(date: string, locale: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" });
}

export function HomeDashboard() {
  const { t, i18n } = useTranslation("home");
  const { activeOrg } = useOrg();
  const { format } = usePriceSource();
  const isMobile = useIsMobile();
  const piRemote = usePiHost() && isRemoteBrowser();
  const { data: session } = useAuthSession();
  const { locks } = useCollectionLocks();
  const overview = useQuery(orgOverviewQueryOptions(activeOrg?.id));
  const summary = useQuery(widgetSummaryQueryOptions(activeOrg?.id));
  const [createOpen, setCreateOpen] = useState(false);
  const locale = i18n.language;
  const numberFormat = new Intl.NumberFormat(locale);
  const firstName = session?.user?.name?.trim().split(/\s+/)[0];
  const greeting = t(`greeting.${greetingPeriodFor(new Date())}`);
  const title = firstName ? t("greetingWithName", { greeting, name: firstName }) : greeting;
  const overviewData = overview.data;
  const summaryData = summary.data;
  const scanPath = isMobile && !piRemote ? MOBILE_SCAN_PATH : "/app";
  const collectionPath = (guid: string) => (isMobile ? monitorCollectionPath(guid) : collectionViewPath(guid));

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
  const collectionNames = new Map((summaryData?.collections ?? []).map((collection) => [collection.guid, collection.name]));

  return (
    <div className="flex flex-col gap-6 md:gap-2">
      <DisplayHeadline title={title} subtitle={t("subtitle")} />

      {overview.isError && (
        <Callout variant="error" icon={IconAlertTriangle}>
          {t("loadFailed")}
        </Callout>
      )}

      {overview.isPending ? (
        <div className="grid gap-4 md:gap-1.5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Skeleton className="h-60 rounded-card" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-28 rounded-card" />
            <Skeleton className="h-28 rounded-card" />
            <Skeleton className="h-28 rounded-card" />
          </div>
        </div>
      ) : overviewData ? (
        <>
          <div className="grid gap-4 md:gap-1.5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
            <ValueHero
              label={t("hero.value")}
              value={format(overviewData.totalValue)}
              change={change ? { change, caption: changeCaption } : null}
              sparklineValues={
                summaryData && summaryData.all.valueHistory.length >= 2
                  ? summaryData.all.valueHistory.map((point) => point.totalValue)
                  : overviewData.scansByDay.map((day) => day.count)
              }
              stats={[
                { label: t("hero.cards"), value: numberFormat.format(overviewData.cardCount) },
                { label: t("hero.collections"), value: numberFormat.format(overviewData.collectionCount) },
                ...(summaryData ? [{ label: t("hero.scanned"), value: numberFormat.format(summaryData.scansAllTime) }] : []),
              ]}
            />
            <div className="flex flex-col gap-2">
              <HomeQuickActions
                actions={[
                  { key: "scan", icon: IconScan, label: t("actions.scan"), to: scanPath, isPrimary: true },
                  { key: "new", icon: IconPlus, label: t("actions.newCollection"), onSelect: () => setCreateOpen(true) },
                  { key: "stats", icon: IconChartBar, label: t("actions.stats"), to: STATS_PATH },
                ]}
              />
              {liveCollections.map(([guid, lock]) => (
                <HomeHighlightRow
                  key={guid}
                  icon={IconBroadcast}
                  tone="success"
                  title={t("live.title", { name: lock.displayName, collection: collectionNames.get(guid) ?? "" })}
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
                      ? monitorCollectionPath(firstReviewCard.collectionGuid)
                      : `${collectionViewPath(firstReviewCard.collectionGuid)}?${CARD_REVIEW_SEARCH_PARAM}=1`
                  }
                />
              )}
            </div>
          </div>

          {overviewData.collectionCount === 0 && (
            <div className="rounded-card bg-card">
              <EmptyState icon={IconSparkles} title={t("welcome.title")} description={t("welcome.description")} />
            </div>
          )}

          {summaryData && (
            <HomeCardRail
              title={t("cardOfTheDay")}
              cards={summaryData.all.cardsOfTheDay}
              tileClassName={HOME_CARD_OF_THE_DAY_TILE_CLASS}
              captionOf={(card) => [card.price != null ? format(card.price) : null, card.collectionName].filter(Boolean).join(" · ")}
            />
          )}

          {overviewData.cardCount > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="font-heading text-base font-semibold text-foreground md:text-sm">{t("activity.title")}</h2>
              <div className="flex flex-col gap-4 md:gap-2 rounded-card bg-card p-5 md:p-2.5">
                <dl className="flex gap-8">
                  <div className="flex flex-col-reverse">
                    <dt className="text-xs text-foreground/70">{t("activity.today")}</dt>
                    <dd className="text-2xl font-bold tabular-nums text-foreground">{numberFormat.format(overviewData.scansToday)}</dd>
                  </div>
                  <div className="flex flex-col-reverse">
                    <dt className="text-xs text-foreground/70">{t("activity.thisWeek")}</dt>
                    <dd className="text-2xl font-bold tabular-nums text-foreground">{numberFormat.format(overviewData.scansThisWeek)}</dd>
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

      <CreateCollectionDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
