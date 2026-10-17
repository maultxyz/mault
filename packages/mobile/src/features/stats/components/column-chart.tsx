import { useState } from "react";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { STATS_CHART_HEIGHT } from "@/lib/constants/stats";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { ColumnChartProps } from "@/lib/interfaces/stats";

export function ColumnChart({ data, formatValue, accessibilityLabel, endLabel }: ColumnChartProps) {
  const colors = useTheme();
  const [selected, setSelected] = useState<number | null>(null);
  if (data.length === 0) return null;

  const max = Math.max(...data.map((datum) => datum.value), 0) || 1;
  const index = Math.min(selected ?? data.length - 1, data.length - 1);
  const current = data[index];

  return (
    <View style={{ gap: SPACING.sm }}>
      <AppText size="sm" style={{ fontVariant: ["tabular-nums"] }}>
        <AppText size="sm" tone="secondary">
          {`${current.label}: `}
        </AppText>
        <AppText size="sm" weight="semibold">
          {formatValue(current.value)}
        </AppText>
      </AppText>
      <View
        accessibilityLabel={accessibilityLabel}
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 2,
          height: STATS_CHART_HEIGHT,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {data.map((datum, i) => (
          <Pressable
            key={datum.key}
            accessibilityRole="button"
            accessibilityLabel={`${datum.label}: ${formatValue(datum.value)}`}
            accessibilityState={{ selected: i === index }}
            onPress={() => setSelected(i === selected ? null : i)}
            style={{ flex: 1, height: "100%", justifyContent: "flex-end" }}
          >
            <View
              style={{
                height: `${(datum.value / max) * 100}%` as `${number}%`,
                minHeight: 2,
                borderTopLeftRadius: RADIUS.sm,
                borderTopRightRadius: RADIUS.sm,
                backgroundColor: i === index ? colors.primaryText : colors.cardRing,
              }}
            />
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: SPACING.sm }}>
        <AppText size="2xs" tone="secondary">
          {data[0].label}
        </AppText>
        <AppText size="2xs" tone="secondary">
          {endLabel ?? data[data.length - 1].label}
        </AppText>
      </View>
    </View>
  );
}
