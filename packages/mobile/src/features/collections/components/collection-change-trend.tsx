import { sparklinePaths } from "@magic-vault/shared";
import { View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import {
  LIBRARY_CHANGE_PILL_MIN_WIDTH,
  LIBRARY_CHANGE_PILL_TEXT_COLORS,
  LIBRARY_CHANGE_SPARKLINE,
} from "@/lib/constants/library";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { CollectionChangeTrendProps } from "@/lib/interfaces/library";

export function CollectionChangeTrend({ values, baseline, change, noChangeLabel }: CollectionChangeTrendProps) {
  const colors = useTheme();
  const { width, height, strokeWidth, baselineDash } = LIBRARY_CHANGE_SPARKLINE;
  const sparkline = sparklinePaths(values, width, height, 0);
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const baselineY = height - (((baseline ?? values[0] ?? min) - min) / range) * height;
  const direction = change?.direction ?? "flat";
  const lineColor =
    direction === "up"
      ? colors.successForeground
      : direction === "down"
        ? colors.destructiveForeground
        : colors.foregroundSecondary;
  const pillBackground =
    direction === "up" ? colors.success : direction === "down" ? colors.destructiveStrong : colors.tonal;
  const pillText =
    direction === "up"
      ? LIBRARY_CHANGE_PILL_TEXT_COLORS.up
      : direction === "down"
        ? LIBRARY_CHANGE_PILL_TEXT_COLORS.down
        : colors.foreground;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
      <View style={{ width, height }}>
        {sparkline && baseline != null ? (
          <Svg width={width} height={height} accessible={false}>
            <Line
              x1={0}
              x2={width}
              y1={baselineY}
              y2={baselineY}
              stroke={colors.foregroundSecondary}
              strokeWidth={1}
              strokeDasharray={baselineDash}
              strokeLinecap="round"
            />
            <Path
              d={sparkline.line}
              fill="none"
              stroke={lineColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        ) : null}
      </View>
      <View
        style={{
          minWidth: LIBRARY_CHANGE_PILL_MIN_WIDTH,
          alignItems: "center",
          paddingHorizontal: SPACING.sm,
          paddingVertical: SPACING.xs + 2,
          borderRadius: RADIUS.sm,
          borderCurve: "continuous",
          backgroundColor: pillBackground,
        }}
      >
        <AppText size="sm" weight="semibold" numberOfLines={1} style={{ color: pillText }}>
          {change ? change.change : noChangeLabel}
        </AppText>
      </View>
    </View>
  );
}
