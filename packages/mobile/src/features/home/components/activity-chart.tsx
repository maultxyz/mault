import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { ACTIVITY_CHART_HEIGHT } from "@/lib/constants/collections";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import { formatDay } from "@/lib/dates";
import type { ActivityChartProps } from "@/lib/interfaces/ui";

export function ActivityChart({ days }: ActivityChartProps) {
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((day) => day.count));
  const index = selected ?? days.length - 1;
  const current = days[index];

  return (
    <View style={{ gap: SPACING.sm }}>
      <AppText size="xs" style={{ fontVariant: ["tabular-nums"] }}>
        {t("home.activityPoint", { date: formatDay(current.date, i18n.language), count: current.count })}
      </AppText>
      <View
        accessibilityRole="adjustable"
        accessibilityLabel={t("home.activityTitle")}
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 2,
          height: ACTIVITY_CHART_HEIGHT,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {days.map((day, i) => (
          <Pressable
            key={day.date}
            accessibilityRole="button"
            accessibilityLabel={t("home.activityPoint", { date: formatDay(day.date, i18n.language), count: day.count })}
            accessibilityState={{ selected: i === index }}
            onPress={() => setSelected(i === selected ? null : i)}
            style={{ flex: 1, height: "100%", justifyContent: "flex-end" }}
          >
            <View
              style={{
                height: `${Math.max(2, (day.count / max) * 100)}%` as `${number}%`,
                minHeight: 2,
                borderTopLeftRadius: RADIUS.sm,
                borderTopRightRadius: RADIUS.sm,
                backgroundColor: i === index ? colors.primaryText : colors.cardRing,
              }}
            />
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <AppText size="2xs" tone="secondary">
          {formatDay(days[0].date, i18n.language)}
        </AppText>
        <AppText size="2xs" tone="secondary">
          {t("home.today")}
        </AppText>
      </View>
    </View>
  );
}
