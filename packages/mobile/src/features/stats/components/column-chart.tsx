import { useState } from "react";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { niceCeiling } from "@/features/stats/lib/chart-scale";
import { useTheme } from "@/hooks/use-theme";
import { STATS_CHART_GRID_FRACTIONS, STATS_CHART_HEIGHT, STATS_COLUMN_VALUE_LABEL_HEIGHT } from "@/lib/constants/stats";
import { SPACING } from "@/lib/constants/theme";
import type { ColumnChartProps } from "@/lib/interfaces/stats";

export function ColumnChart({
  data,
  formatValue,
  formatColumnValue,
  accessibilityLabel,
  endLabel,
  columnGap = 2,
  labelEachColumn = false,
}: ColumnChartProps) {
  const colors = useTheme();
  const [selected, setSelected] = useState<number | null>(null);
  if (data.length === 0) return null;

  const largest = Math.max(...data.map((datum) => datum.value), 0);
  const yMax = formatColumnValue ? largest || 1 : niceCeiling(largest);
  const plotHeight = STATS_CHART_HEIGHT - (formatColumnValue ? STATS_COLUMN_VALUE_LABEL_HEIGHT : 0);
  const defaultIndex = labelEachColumn ? data.findIndex((datum) => datum.value === largest) : data.length - 1;
  const index = Math.max(0, Math.min(selected ?? defaultIndex, data.length - 1));
  const current = data[index];
  const columnRadius = Math.min(4, columnGap + 2);

  return (
    <View style={{ gap: SPACING.sm }}>
      <AppText size="sm" style={{ fontVariant: ["tabular-nums"] }}>
        <AppText size="sm" tone="secondary">
          {`${current.label}: `}
        </AppText>
        <AppText size="sm" weight="semibold">
          {formatValue(current.value)}
        </AppText>
        {current.detail ? (
          <AppText size="sm" tone="secondary">
            {` · ${current.detail}`}
          </AppText>
        ) : null}
      </AppText>
      <View accessibilityLabel={accessibilityLabel} style={{ height: STATS_CHART_HEIGHT }}>
        {formatColumnValue
          ? null
          : STATS_CHART_GRID_FRACTIONS.map((fraction) => (
              <View
                key={fraction}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: fraction * plotHeight,
                  height: 1,
                  backgroundColor: colors.border,
                }}
              />
            ))}
        <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-end", gap: columnGap }}>
          {data.map((datum, i) => {
            const isSelected = i === index;
            return (
              <Pressable
                key={datum.key}
                accessibilityRole="button"
                accessibilityLabel={[`${datum.label}: ${formatValue(datum.value)}`, datum.detail].filter(Boolean).join(", ")}
                accessibilityState={{ selected: isSelected }}
                onPress={() => setSelected(i === selected ? null : i)}
                style={{ flex: 1, height: "100%", justifyContent: "flex-end", alignItems: "stretch" }}
              >
                {formatColumnValue ? (
                  <AppText
                    size="2xs"
                    weight={isSelected ? "semibold" : undefined}
                    tone={isSelected ? undefined : "secondary"}
                    numberOfLines={1}
                    style={{ textAlign: "center", fontVariant: ["tabular-nums"], marginBottom: 2 }}
                  >
                    {formatColumnValue(datum.value)}
                  </AppText>
                ) : null}
                <View
                  style={{
                    height: Math.max((datum.value / yMax) * plotHeight, 2),
                    borderTopLeftRadius: columnRadius,
                    borderTopRightRadius: columnRadius,
                    backgroundColor: isSelected ? colors.primaryText : colors.primaryMuted,
                  }}
                />
              </Pressable>
            );
          })}
        </View>
        {formatColumnValue ? (
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1, backgroundColor: colors.border }} />
        ) : null}
      </View>
      {labelEachColumn ? (
        <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ flexDirection: "row", gap: columnGap }}>
          {data.map((datum, i) => (
            <AppText
              key={datum.key}
              size="2xs"
              tone={i === index ? undefined : "secondary"}
              weight={i === index ? "semibold" : undefined}
              numberOfLines={2}
              style={{ flex: 1, textAlign: "center" }}
            >
              {datum.label}
            </AppText>
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: SPACING.sm }}>
          <AppText size="2xs" tone="secondary">
            {data[0].label}
          </AppText>
          <AppText size="2xs" tone="secondary">
            {endLabel ?? data[data.length - 1].label}
          </AppText>
        </View>
      )}
    </View>
  );
}
