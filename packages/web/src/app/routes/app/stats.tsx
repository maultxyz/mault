import { Callout } from "@/components/callout";
import { EmptyState } from "@/components/empty-state";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { ResponsiveSegmented } from "@/components/responsive-segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { AccuracyReportView } from "@/features/business/components/accuracy-report";
import { StaffReportView } from "@/features/business/components/staff-report";
import { useOrg } from "@/features/companies/api/use-organization";
import { statsReportQueryOptions } from "@/features/stats/api/stats";
import { StatsControls } from "@/features/stats/components/stats-controls";
import { StatsDashboard } from "@/features/stats/components/stats-dashboard";
import { StatsLeaderboardButton } from "@/features/stats/components/stats-leaderboard";
import { useBackNavigation } from "@/hooks/use-back-navigation";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  MOBILE_HOME_PATH,
  MOBILE_NAV_SCROLL_PADDING_CLASS,
} from "@/lib/constants/nav";
import {
  STATS_CHECK_PARAM,
  STATS_COLLECTION_PARAM,
  STATS_OVERVIEW_VIEW,
  STATS_RANGE_PARAM,
  STATS_VIEW_PARAM,
  STATS_VIEWS,
} from "@/lib/constants/stats";
import type { StatsView } from "@/lib/interfaces/stats";
import { cn } from "@/lib/utils";
import {
  STATS_DEFAULT_RANGE,
  STATS_RANGES,
  type StatsRange,
} from "@magic-vault/shared";
import { IconAlertTriangle, IconChartBar } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

function parseRange(value: string | null): StatsRange {
  return STATS_RANGES.find((range) => range === value) ?? STATS_DEFAULT_RANGE;
}

export default function StatsPage() {
  const { t } = useTranslation("stats");
  const isMobile = useIsMobile();
  const goBack = useBackNavigation(MOBILE_HOME_PATH);
  const { activeOrg } = useOrg();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [params, setParams] = useSearchParams();
  const range = parseRange(params.get(STATS_RANGE_PARAM));
  const collectionGuid = params.get(STATS_COLLECTION_PARAM);
  const view =
    STATS_VIEWS.find((value) => value === params.get(STATS_VIEW_PARAM)) ??
    STATS_OVERVIEW_VIEW;
  const {
    data: report,
    isLoading,
    isError,
  } = useQuery(statsReportQueryOptions(activeOrg?.id, range, collectionGuid));

  const setParam = (key: string, value: string | null) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  };

  const selectCollection = (guid: string | null) => {
    setParam(STATS_COLLECTION_PARAM, guid);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  const viewSwitch = (
    <ResponsiveSegmented<StatsView>
      label={t("title")}
      items={STATS_VIEWS.map((value) => ({
        key: value,
        label: t(`views.${value}`),
      }))}
      value={view}
      onChange={(value) => {
        setParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            if (value === STATS_OVERVIEW_VIEW) next.delete(STATS_VIEW_PARAM);
            else next.set(STATS_VIEW_PARAM, value);
            next.delete(STATS_CHECK_PARAM);
            return next;
          },
          { replace: true },
        );
        scrollRef.current?.scrollTo({ top: 0 });
      }}
    />
  );

  const controls = (
    <StatsControls
      collectionGuid={collectionGuid}
      onCollectionChange={selectCollection}
      range={range}
      onRangeChange={(next) =>
        setParam(STATS_RANGE_PARAM, next === STATS_DEFAULT_RANGE ? null : next)
      }
    />
  );

  const body =
    view === "staff" ? (
      <StaffReportView
        range={range}
        onRangeChange={(next) =>
          setParam(
            STATS_RANGE_PARAM,
            next === STATS_DEFAULT_RANGE ? null : next,
          )
        }
      />
    ) : view === "accuracy" ? (
      <AccuracyReportView
        collectionGuid={collectionGuid}
        checkGuid={params.get(STATS_CHECK_PARAM)}
        onCollectionChange={(guid) => setParam(STATS_COLLECTION_PARAM, guid)}
        onCheckChange={(guid) => setParam(STATS_CHECK_PARAM, guid)}
      />
    ) : isError ? (
      <Callout variant="error" icon={IconAlertTriangle}>
        {t("error")}
      </Callout>
    ) : isLoading || !report ? (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    ) : report.totals.cardCount === 0 ? (
      <EmptyState
        icon={IconChartBar}
        title={t("empty.title")}
        description={t("empty.description")}
      />
    ) : (
      <StatsDashboard report={report} onSelectCollection={selectCollection} />
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isMobile && (
        <MobilePageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          onBack={goBack}
          actions={<StatsLeaderboardButton iconOnly />}
        />
      )}
      <div
        ref={scrollRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          MOBILE_NAV_SCROLL_PADDING_CLASS,
        )}
      >
        {!isMobile && (
          <div className="sticky top-0 z-20 border-b bg-background/80 py-3 backdrop-blur-2xl md:py-4">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-4 px-4 md:px-6">
              <div className="min-w-0">
                <h1 className="font-heading text-lg font-semibold">
                  {t("title")}
                </h1>
                <p className="text-xs text-foreground/70">{t("subtitle")}</p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                {viewSwitch}
                {view === STATS_OVERVIEW_VIEW && controls}
                <StatsLeaderboardButton />
              </div>
            </div>
          </div>
        )}
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
          {isMobile && viewSwitch}
          {isMobile && view === STATS_OVERVIEW_VIEW && controls}
          {body}
        </div>
      </div>
    </div>
  );
}
