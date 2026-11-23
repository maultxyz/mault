import {
  buildLeaderboardRows,
  DEFAULT_LEADERBOARD_METRIC,
  DEFAULT_LEADERBOARD_PERIOD,
  LEADERBOARD_METRICS,
  LEADERBOARD_PERIODS,
  LEADERBOARD_SIZE,
  leaderboardMetricCountsSelfHosted,
  type LeaderboardMetric,
  type LeaderboardPeriod,
} from "@magic-vault/shared";
import { Callout } from "@/components/callout";
import { ResponsiveSegmented } from "@/components/responsive-segmented";
import { ViewTabs } from "@/components/view-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { SkeletonStatus } from "@/components/skeleton-status";
import { TableSkeleton } from "@/components/table-skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrg } from "@/features/companies/api/use-organization";
import { leaderboardQueryOptions } from "@/features/stats/api/leaderboard";
import { AUTH_PROVIDER } from "@/lib/constants/auth";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import {
  STATS_LEADERBOARD_SKELETON_COLUMNS,
  STATS_LEADERBOARD_SKELETON_ROWS,
} from "@/lib/constants/skeletons";
import type {
  StatsLeaderboardButtonProps,
  StatsLeaderboardContentProps,
} from "@/lib/interfaces/stats";
import { MOBILE_ICON_BUTTON_CLASS } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { IconAlertTriangle, IconTrophy } from "@tabler/icons-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

function StatsLeaderboardContent({
  metric,
  onMetricChange,
}: StatsLeaderboardContentProps) {
  const { t, i18n } = useTranslation("stats");
  const { activeOrg } = useOrg();
  const numberFormat = new Intl.NumberFormat(i18n.language);
  const [period, setPeriod] = useState<LeaderboardPeriod>(
    DEFAULT_LEADERBOARD_PERIOD,
  );
  const [hideSelfHosted, setHideSelfHosted] = useState(false);
  const canIncludeSelfHosted =
    AUTH_PROVIDER !== "local" && leaderboardMetricCountsSelfHosted(metric);
  const {
    data: leaderboard,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    ...leaderboardQueryOptions(activeOrg?.id, {
      metric,
      period,
      includeSelfHosted: canIncludeSelfHosted && !hideSelfHosted,
    }),
    placeholderData: keepPreviousData,
  });

  const metricTabs = (
    <ViewTabs
      label={t("leaderboard.metrics.label")}
      value={metric}
      onChange={onMetricChange}
      items={LEADERBOARD_METRICS.map((key) => ({
        key,
        label: t(`leaderboard.metrics.${key}`),
      }))}
    />
  );

  const periodPicker = (
    <div className="flex flex-col gap-1">
      <ResponsiveSegmented
        label={t("leaderboard.periods.label")}
        value={period}
        onChange={setPeriod}
        items={LEADERBOARD_PERIODS.map((key) => ({
          key,
          label: t(`leaderboard.periods.${key}`),
        }))}
      />
      <span className="text-xs text-foreground/70">
        {t("leaderboard.updatedDaily")}
      </span>
    </div>
  );

  const selfHostedToggle = (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-foreground/6 px-3 py-2">
      <div className="flex min-w-0 flex-col">
        <Label htmlFor="leaderboard-hide-self-hosted" className="text-control">
          {t("leaderboard.hideSelfHosted.label")}
        </Label>
        <span className="text-xs text-foreground/70">
          {t("leaderboard.hideSelfHosted.description")}
        </span>
      </div>
      <Switch
        id="leaderboard-hide-self-hosted"
        checked={hideSelfHosted}
        onCheckedChange={setHideSelfHosted}
      />
    </div>
  );

  const body = isError ? (
    <Callout
      variant="error"
      icon={IconAlertTriangle}
      action={
        <Button variant="outline" onClick={() => void refetch()}>
          {t("common:a11y.retry")}
        </Button>
      }
    >
      {t("leaderboard.error")}
    </Callout>
  ) : isLoading || !leaderboard ? (
    <SkeletonStatus>
      <TableSkeleton
        columns={STATS_LEADERBOARD_SKELETON_COLUMNS}
        rows={STATS_LEADERBOARD_SKELETON_ROWS}
      />
    </SkeletonStatus>
  ) : (
    <>
      {!leaderboard.optedIn && (
        <Callout
          variant="info"
          icon={IconTrophy}
          title={t("leaderboard.optIn.title")}
          action={
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to={SETTINGS_PATHS.general} />}
            >
              {t("leaderboard.optIn.action")}
            </Button>
          }
        >
          {t("leaderboard.optIn.description")}
        </Callout>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16 text-xs">
              {t("leaderboard.columns.rank")}
            </TableHead>
            <TableHead className="text-xs">
              {t("leaderboard.columns.organization")}
            </TableHead>
            <TableHead className="text-right text-xs">
              {t(`leaderboard.columns.${metric}`)}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {buildLeaderboardRows(leaderboard).map(({ key, entry }) => (
            <TableRow
              key={key}
              className={cn(
                entry.isOwnOrg &&
                  "bg-primary/10 text-primary hover:bg-primary/10 dark:bg-primary/20 dark:hover:bg-primary/20",
              )}
            >
              <TableCell className="text-sm font-medium tabular-nums">
                {t("leaderboard.rank", { rank: entry.rank })}
              </TableCell>
              <TableCell className="max-w-56 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "truncate font-medium",
                      entry.isOwnOrg ? "text-primary" : "text-foreground",
                    )}
                  >
                    {entry.name ??
                      (entry.isAnonymous
                        ? t("leaderboard.anonymousOrg")
                        : t("leaderboard.unknownOrg"))}
                  </span>
                  {leaderboard.includesSelfHosted &&
                    entry.selfHostedScanCount > 0 && (
                      <Badge variant="outline">
                        {t("leaderboard.selfHostedBadge")}
                      </Badge>
                    )}
                  {entry.isOwnOrg && (
                    <Badge variant="outline">
                      {leaderboard.optedIn
                        ? t("leaderboard.you")
                        : t("leaderboard.hidden")}
                    </Badge>
                  )}
                </span>
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {numberFormat.format(entry.scanCount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );

  return (
    <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
      {metricTabs}
      {periodPicker}
      {canIncludeSelfHosted && selfHostedToggle}
      {body}
    </div>
  );
}

export function StatsLeaderboardButton({
  iconOnly,
}: StatsLeaderboardButtonProps) {
  const { t } = useTranslation("stats");
  const [metric, setMetric] = useState<LeaderboardMetric>(
    DEFAULT_LEADERBOARD_METRIC,
  );

  return (
    <DynamicDialog
      title={t("leaderboard.title")}
      description={t(`leaderboard.descriptions.${metric}`, {
        count: LEADERBOARD_SIZE,
      })}
      className="max-h-[85vh] sm:max-w-lg"
      trigger={
        <Button
          variant={iconOnly ? "ghost" : "outline"}
          size={iconOnly ? "icon" : "default"}
          className={iconOnly ? MOBILE_ICON_BUTTON_CLASS : undefined}
          aria-label={iconOnly ? t("leaderboard.title") : undefined}
        >
          <IconTrophy />
          {!iconOnly && t("leaderboard.title")}
        </Button>
      }
    >
      <StatsLeaderboardContent metric={metric} onMetricChange={setMetric} />
    </DynamicDialog>
  );
}
