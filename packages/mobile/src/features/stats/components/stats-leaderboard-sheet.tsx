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
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet } from "@/components/ui/sheet";
import { Surface } from "@/components/ui/surface";
import { SwitchRow } from "@/components/ui/switch-row";
import { TabStrip } from "@/components/ui/tab-strip";
import { leaderboardQueryOptions } from "@/features/stats/api/stats";
import { useActiveOrgId } from "@/hooks/use-org";
import { AUTH_PROVIDER } from "@/lib/constants/config";
import { SPACING } from "@/lib/constants/theme";
import { LIST_ROW_ICON_SIZE } from "@/lib/constants/ui";
import type { StatsLeaderboardSheetProps } from "@/lib/interfaces/stats";

export function StatsLeaderboardSheet({ visible, onClose }: StatsLeaderboardSheetProps) {
  const { t, i18n } = useTranslation();
  const orgId = useActiveOrgId();
  const [metric, setMetric] = useState<LeaderboardMetric>(DEFAULT_LEADERBOARD_METRIC);
  const [period, setPeriod] = useState<LeaderboardPeriod>(DEFAULT_LEADERBOARD_PERIOD);
  const [hideSelfHosted, setHideSelfHosted] = useState(false);
  const canIncludeSelfHosted = AUTH_PROVIDER !== "local" && leaderboardMetricCountsSelfHosted(metric);
  const { data: leaderboard, isPending, isError } = useQuery({
    ...leaderboardQueryOptions(orgId, {
      metric,
      period,
      includeSelfHosted: canIncludeSelfHosted && !hideSelfHosted,
    }),
    enabled: visible && !!orgId,
  });

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t("stats.leaderboard.title")}
      description={t(`stats.leaderboard.descriptions.${metric}`, { count: LEADERBOARD_SIZE })}
      contentContainerStyle={{ gap: SPACING.md }}
    >
      <TabStrip<LeaderboardMetric>
        inline
        value={metric}
        onChange={setMetric}
        items={LEADERBOARD_METRICS.map((value) => ({ value, label: t(`stats.leaderboard.metrics.${value}`) }))}
      />
      <SegmentedControl<LeaderboardPeriod>
        value={period}
        onChange={setPeriod}
        options={LEADERBOARD_PERIODS.map((value) => ({ value, label: t(`stats.leaderboard.periods.${value}`) }))}
      />
      <AppText tone="secondary" size="xs">
        {t("stats.leaderboard.updatedDaily")}
      </AppText>
      {canIncludeSelfHosted ? (
        <Surface>
          <SwitchRow
            title={t("stats.leaderboard.hideSelfHosted.label")}
            description={t("stats.leaderboard.hideSelfHosted.description")}
            value={hideSelfHosted}
            onValueChange={setHideSelfHosted}
          />
        </Surface>
      ) : null}
      {isError ? (
        <Callout tone="destructive" title={t("stats.leaderboard.error")} />
      ) : isPending || !leaderboard ? (
        <ListSkeleton rows={5} />
      ) : (
        <>
          {!leaderboard.optedIn ? (
            <Callout
              tone="info"
              title={t("stats.leaderboard.optIn.title")}
              description={t("stats.leaderboard.optIn.description")}
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  label={t("stats.leaderboard.optIn.action")}
                  onPress={() => {
                    onClose();
                    router.push("/settings/general");
                  }}
                />
              }
            />
          ) : null}
          <ListGroup>
            {buildLeaderboardRows(leaderboard).map(({ key, entry }) => (
              <ListRow
                key={key}
                leading={
                  <AppText weight="bold" style={{ width: LIST_ROW_ICON_SIZE }}>
                    {t("stats.leaderboard.rank", { rank: entry.rank })}
                  </AppText>
                }
                title={entry.name ?? t("stats.leaderboard.unknownOrg")}
                subtitle={
                  [
                    entry.isOwnOrg
                      ? leaderboard.optedIn
                        ? t("stats.leaderboard.you")
                        : t("stats.leaderboard.hidden")
                      : null,
                    leaderboard.includesSelfHosted && entry.selfHostedScanCount > 0
                      ? t("stats.leaderboard.selfHostedBadge")
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || undefined
                }
                value={entry.scanCount.toLocaleString(i18n.language)}
                selected={entry.isOwnOrg}
              />
            ))}
          </ListGroup>
        </>
      )}
    </Sheet>
  );
}
