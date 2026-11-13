import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { IconBadge } from "@/components/ui/icon-badge";
import { SectionHeader } from "@/components/ui/section-header";
import { useTheme } from "@/hooks/use-theme";
import { SPACING, SURFACE_RADIUS } from "@/lib/constants/theme";
import type { StatsHighlightsProps } from "@/lib/interfaces/stats";

export function StatsHighlights({ insights }: StatsHighlightsProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  if (insights.length === 0) return null;

  return (
    <View style={{ gap: SPACING.sm }}>
      <SectionHeader title={t("stats.highlights.title")} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -SPACING.xs, rowGap: SPACING.sm }}>
        {insights.map((insight) => (
          <View key={insight.key} style={{ width: "50%", paddingHorizontal: SPACING.xs }}>
            <View
              accessible
              accessibilityLabel={`${insight.title}. ${insight.detail}`}
              style={{
                flex: 1,
                gap: SPACING.md,
                padding: SPACING.lg,
                borderRadius: SURFACE_RADIUS,
                borderCurve: "continuous",
                backgroundColor: colors.card,
              }}
            >
              <IconBadge name={insight.icon} tone="primary" />
              <View style={{ flex: 1, justifyContent: "flex-end", gap: 2 }}>
                <AppText weight="semibold">{insight.title}</AppText>
                <AppText size="xs" tone="secondary">
                  {insight.detail}
                </AppText>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
