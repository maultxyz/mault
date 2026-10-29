import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LEADERBOARD_SIZE } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { IconButton } from "@/components/ui/icon-button";
import { Pill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { leaderboardQueryOptions } from "@/features/stats/api/stats";
import { buildLeaderboardRows } from "@/features/stats/lib/stats-breakdown";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { StatsLeaderboardSheetProps } from "@/lib/interfaces/stats";

export function StatsLeaderboardSheet({ visible, onClose }: StatsLeaderboardSheetProps) {
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const orgId = useActiveOrgId();
  const { data: leaderboard, isPending, isError } = useQuery({
    ...leaderboardQueryOptions(orgId),
    enabled: visible && !!orgId,
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityLabel={t("common.dismiss")} onPress={onClose} style={{ flex: 1, backgroundColor: colors.overlay }} />
      <View
        style={{
          maxHeight: "85%",
          backgroundColor: colors.background,
          borderTopLeftRadius: RADIUS.xl,
          borderTopRightRadius: RADIUS.xl,
          borderWidth: 1,
          borderBottomWidth: 0,
          borderColor: colors.border,
          paddingBottom: insets.bottom + SPACING.md,
        }}
      >
        <View style={{ alignItems: "center", paddingTop: SPACING.sm }}>
          <View style={{ width: 36, height: 4, borderRadius: RADIUS.full, backgroundColor: colors.border }} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm, paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText size="lg" heading weight="bold">
              {t("stats.leaderboard.title")}
            </AppText>
            <AppText size="sm" tone="secondary">
              {t("stats.leaderboard.description", { count: LEADERBOARD_SIZE })}
            </AppText>
          </View>
          <IconButton icon="dismiss" size={36} accessibilityLabel={t("common.dismiss")} onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, gap: SPACING.md, paddingBottom: SPACING.md }}>
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
                      backgroundColor: entry.isOwnOrg ? colors.muted : "transparent",
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
        </ScrollView>
      </View>
    </Modal>
  );
}
