import { buildLeaderboardRows } from "@magic-vault/shared";
import { Callout } from "@/components/callout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { Skeleton } from "@/components/ui/skeleton";
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
import type { StatsLeaderboardButtonProps } from "@/lib/interfaces/stats";
import { MOBILE_ICON_BUTTON_CLASS } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { LEADERBOARD_SIZE } from "@magic-vault/shared";
import { IconAlertTriangle, IconTrophy } from "@tabler/icons-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

function StatsLeaderboardContent() {
  const { t, i18n } = useTranslation("stats");
  const { activeOrg } = useOrg();
  const numberFormat = new Intl.NumberFormat(i18n.language);
  const [hideSelfHosted, setHideSelfHosted] = useState(false);
  const {
    data: leaderboard,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    ...leaderboardQueryOptions(
      activeOrg?.id,
      AUTH_PROVIDER !== "local" && !hideSelfHosted,
    ),
    placeholderData: keepPreviousData,
  });

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

  return isError ? (
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
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-8 rounded-sm" />
      ))}
    </div>
  ) : (
    <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
      {AUTH_PROVIDER !== "local" && selfHostedToggle}
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
              {t("leaderboard.columns.scans")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {buildLeaderboardRows(leaderboard).map(({ key, entry }) => (
            <TableRow
              key={key}
              className={cn(entry.isOwnOrg && "bg-foreground/6 hover:bg-foreground/6")}
            >
              <TableCell className="text-sm font-medium tabular-nums">
                {t("leaderboard.rank", { rank: entry.rank })}
              </TableCell>
              <TableCell className="max-w-56 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium text-foreground">
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
    </div>
  );
}

export function StatsLeaderboardButton({
  iconOnly,
}: StatsLeaderboardButtonProps) {
  const { t } = useTranslation("stats");

  return (
    <DynamicDialog
      title={t("leaderboard.title")}
      description={t("leaderboard.description", { count: LEADERBOARD_SIZE })}
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
      <StatsLeaderboardContent />
    </DynamicDialog>
  );
}
