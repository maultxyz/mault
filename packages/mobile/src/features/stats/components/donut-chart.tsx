import { useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { STATS_DONUT } from "@/lib/constants/stats";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { DonutChartProps } from "@/lib/interfaces/stats";

export function DonutChart({ segments, centerValue, centerLabel, formatShare }: DonutChartProps) {
  const colors = useTheme();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (total <= 0) return null;

  const { size, strokeWidth, gap, dimmedOpacity } = STATS_DONUT;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const visible = segments.filter((segment) => segment.value > 0);
  const gapLength = visible.length > 1 ? gap : 0;
  const selected = visible.find((segment) => segment.key === selectedKey) ?? null;
  let offset = 0;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.lg }}>
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
            {visible.map((segment) => {
              const length = (segment.value / total) * circumference;
              const dash = Math.max(length - gapLength, 1);
              const circle = (
                <Circle
                  key={segment.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  opacity={selected && selected.key !== segment.key ? dimmedOpacity : 1}
                />
              );
              offset += length;
              return circle;
            })}
          </G>
        </Svg>
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", padding: strokeWidth + 4 }}>
          <AppText size="lg" heading weight="bold" numberOfLines={1} adjustsFontSizeToFit>
            {selected ? formatShare(selected.value, total) : centerValue}
          </AppText>
          <AppText size="2xs" tone="secondary" numberOfLines={2} style={{ textAlign: "center" }}>
            {selected ? selected.label : centerLabel}
          </AppText>
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        {visible.map((segment) => {
          const isSelected = selected?.key === segment.key;
          return (
            <Pressable
              key={segment.key}
              accessibilityRole="button"
              accessibilityLabel={`${segment.label}: ${formatShare(segment.value, total)}`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => setSelectedKey(isSelected ? null : segment.key)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: SPACING.sm,
                paddingVertical: SPACING.xs,
                paddingHorizontal: SPACING.sm,
                marginHorizontal: -SPACING.sm,
                borderRadius: RADIUS.md,
                backgroundColor: isSelected ? colors.primarySelected : pressed ? colors.muted : "transparent",
              })}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: RADIUS.full,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: segment.color,
                }}
              />
              <AppText size="sm" numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>
                {segment.label}
              </AppText>
              <AppText size="sm" weight="semibold">
                {formatShare(segment.value, total)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
