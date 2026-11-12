import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { LEADERBOARD_SIZE } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Pill } from "@/components/ui/pill";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { leaderboardQueryOptions } from "@/features/stats/api/stats";
import { buildLeaderboardRows } from "@/features/stats/lib/stats-breakdown";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { StatsLeaderboardSheetProps } from "@/lib/interfaces/stats";

export function StatsLeaderboardSheet({ visible, onClose }: StatsLeaderboardSheetProps) {
  const { t, i18n } = useTranslation();
  const colors = useTheme();
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
        <View style={{ gap: SPACING.sm }}>
          {[0, 1, 2, 3, 4].map((key) => (
            <Skeleton key={key} height={44} />
          ))}
        </View>
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
          <View>
            {buildLeaderboardRows(leaderboard).map(({ key, entry }) => (
              <View
                key={key}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: SPACING.md,
                  minHeight: 52,
                  paddingHorizontal: SPACING.sm,
                  marginHorizontal: -SPACING.sm,
                  borderRadius: RADIUS.md,
                  backgroundColor: entry.isOwnOrg ? colors.primarySelected : "transparent",
                }}
              >
                <AppText weight="bold" style={{ width: 40, fontVariant: ["tabular-nums"] }}>
                  {t("stats.leaderboard.rank", { rank: entry.rank })}
                </AppText>
                <View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
                  <AppText weight="medium" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {entry.name ?? t("stats.leaderboard.unknownOrg")}
                  </AppText>
                  {entry.isOwnOrg ? (
                    <Pill
                      tone="info"
                      label={leaderboard.optedIn ? t("stats.leaderboard.you") : t("stats.leaderboard.hidden")}
                    />
                  ) : null}
                </View>
                <AppText style={{ fontVariant: ["tabular-nums"] }}>
                  {entry.scanCount.toLocaleString(i18n.language)}
                </AppText>
              </View>
            ))}
          </View>
        </>
      )}
    </Sheet>
  );
}
