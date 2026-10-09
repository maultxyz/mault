import { Callout } from "@/components/callout";
import { EmptyState } from "@/components/empty-state";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrg } from "@/features/companies/api/use-organization";
import { statsReportQueryOptions } from "@/features/stats/api/stats";
import { StatsControls } from "@/features/stats/components/stats-controls";
import { StatsDashboard } from "@/features/stats/components/stats-dashboard";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/lib/constants/nav";
import {
  STATS_COLLECTION_PARAM,
  STATS_RANGE_PARAM,
} from "@/lib/constants/stats";
import { SettingsSectionLayoutContext } from "@/lib/settings-section-context";
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
  const { activeOrg } = useOrg();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [params, setParams] = useSearchParams();
  const range = parseRange(params.get(STATS_RANGE_PARAM));
  const collectionGuid = params.get(STATS_COLLECTION_PARAM);
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

  const body = isError ? (
    <Callout variant="error" icon={IconAlertTriangle}>
      {t("error")}
    </Callout>
  ) : isLoading || !report ? (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 md:grid-cols-3 md:gap-x-6 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-md" />
        ))}
      </div>
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
        <MobilePageHeader title={t("title")} subtitle={t("subtitle")} />
      )}
      <div
        ref={scrollRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          MOBILE_NAV_SCROLL_PADDING_CLASS,
        )}
      >
        <SettingsSectionLayoutContext value="flat">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:gap-6 md:p-6">
            {isMobile ? (
              controls
            ) : (
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="font-heading text-lg font-semibold">
                    {t("title")}
                  </h1>
                  <p className="text-xs text-foreground/70">{t("subtitle")}</p>
                </div>
                {controls}
              </div>
            )}
            {body}
          </div>
        </SettingsSectionLayoutContext>
      </div>
    </div>
  );
}
