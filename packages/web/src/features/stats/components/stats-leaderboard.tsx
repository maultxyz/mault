import { Callout } from "@/components/callout";
import { SettingsSection } from "@/components/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { buildLeaderboardRows } from "@/features/stats/lib/leaderboard-rows";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import { cn } from "@/lib/utils";
import { LEADERBOARD_SIZE } from "@magic-vault/shared";
import { IconAlertTriangle, IconTrophy } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function StatsLeaderboard() {
  const { t } = useTranslation("stats");
  const { activeOrg } = useOrg();
  const {
    data: leaderboard,
    isLoading,
    isError,
  } = useQuery(leaderboardQueryOptions(activeOrg?.id));

  const body = isError ? (
    <Callout variant="error" icon={IconAlertTriangle}>
      {t("leaderboard.error")}
    </Callout>
  ) : isLoading || !leaderboard ? (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-8 rounded-sm" />
      ))}
    </div>
  ) : (
    <div className="flex flex-col gap-3">
      {!leaderboard.optedIn && (
        <Callout
          variant="info"
          icon={IconTrophy}
          title={t("leaderboard.optIn.title")}
          action={
            <Button
              size="sm"
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
              {t("leaderboard.columns.scans")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {buildLeaderboardRows(leaderboard).map(({ key, entry }) => (
            <TableRow
              key={key}
              className={cn(entry.isOwnOrg && "bg-muted hover:bg-muted")}
            >
              <TableCell className="text-sm font-medium tabular-nums">
                {t("leaderboard.rank", { rank: entry.rank })}
              </TableCell>
              <TableCell className="max-w-56 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium text-foreground">
                    {entry.name ?? t("leaderboard.unknownOrg")}
                  </span>
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
                {entry.scanCount.toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <SettingsSection
      heading={t("leaderboard.title")}
      description={t("leaderboard.description", { count: LEADERBOARD_SIZE })}
    >
      {body}
    </SettingsSection>
  );
}
