import { buildLeaderboardRows } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { LEADERBOARD_SIZE } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Sheet } from "@/components/ui/sheet";
import { leaderboardQueryOptions } from "@/features/stats/api/stats";
import { useActiveOrgId } from "@/hooks/use-org";
import { SPACING } from "@/lib/constants/theme";
import { LIST_ROW_ICON_SIZE } from "@/lib/constants/ui";
import type { StatsLeaderboardSheetProps } from "@/lib/interfaces/stats";

export function StatsLeaderboardSheet({ visible, onClose }: StatsLeaderboardSheetProps) {
  const { t, i18n } = useTranslation();
  const orgId = useActiveOrgId();
  const { data: leaderboard, isPending, isError } = useQuery({
    ...leaderboardQueryOptions(orgId),
    enabled: visible && !!orgId,
  });

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t("stats.leaderboard.title")}
      description={t("stats.leaderboard.description", { count: LEADERBOARD_SIZE })}
      contentContainerStyle={{ gap: SPACING.md }}
    >
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
                  entry.isOwnOrg
                    ? leaderboard.optedIn
                      ? t("stats.leaderboard.you")
                      : t("stats.leaderboard.hidden")
                    : undefined
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
