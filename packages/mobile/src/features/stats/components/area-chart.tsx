import { useId, useRef, useState } from "react";
import { PanResponder, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";
import { AppText } from "@/components/ui/app-text";
import { indexAtX, niceCeiling, smoothLinePath } from "@magic-vault/shared";
import { useTheme } from "@/hooks/use-theme";
import { STATS_AREA_CHART, STATS_CHART_GRID_FRACTIONS } from "@/lib/constants/stats";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { AreaChartProps } from "@/lib/interfaces/stats";

export function AreaChart({ data, formatValue, formatAxisValue, accessibilityLabel, endLabel }: AreaChartProps) {
  const colors = useTheme();
  const gradientId = useId();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [pillWidth, setPillWidth] = useState(0);
  const widthRef = useRef(0);
  const countRef = useRef(data.length);
  widthRef.current = width;
  countRef.current = data.length;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: (event) => setSelected(indexAtX(event.nativeEvent.locationX, widthRef.current, countRef.current)),
      onPanResponderMove: (event) => setSelected(indexAtX(event.nativeEvent.locationX, widthRef.current, countRef.current)),
    }),
  ).current;

  if (data.length === 0) return null;

  const { height, topPadding, strokeWidth, fillOpacity, dotRadius, pillHeight, pillGap } = STATS_AREA_CHART;
  const index = Math.min(selected ?? data.length - 1, data.length - 1);
  const current = data[index];
  const yMax = niceCeiling(Math.max(...data.map((datum) => datum.value)));
  const plotHeight = height - topPadding;
  const baseline = height;
  const xOf = (i: number) => (data.length === 1 ? width / 2 : (i / (data.length - 1)) * width);
  const yOf = (value: number) => topPadding + plotHeight - (value / yMax) * plotHeight;
  const points = data.map((datum, i) => ({ x: xOf(i), y: yOf(datum.value) }));
  const line = width > 0 && points.length > 1 ? smoothLinePath(points, baseline) : null;
  const area = line ? `${line} L ${width} ${baseline} L 0 ${baseline} Z` : null;
  const pillLeft = Math.max(0, Math.min(width - pillWidth, (points[index]?.x ?? 0) - pillWidth / 2));
  const pillTop = Math.max(0, (points[index]?.y ?? 0) - pillHeight - pillGap);
  const step = (delta: number) => setSelected(Math.max(0, Math.min(data.length - 1, index + delta)));

  return (
    <View style={{ gap: SPACING.sm }}>
      <AppText size="sm">
        <AppText size="sm" tone="secondary">
          {`${current.label}: `}
        </AppText>
        <AppText size="sm" weight="semibold">
          {formatValue(current.value)}
        </AppText>
      </AppText>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: `${current.label}: ${formatValue(current.value)}` }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) => step(event.nativeEvent.actionName === "increment" ? 1 : -1)}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={{ height }}
      >
        {width > 0 ? (
          <Svg width={width} height={height} style={{ position: "absolute" }}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.primaryText} stopOpacity={fillOpacity} />
                <Stop offset="1" stopColor={colors.primaryText} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {STATS_CHART_GRID_FRACTIONS.map((fraction) => (
              <Line
                key={fraction}
                x1={0}
                x2={width}
                y1={yOf(yMax * fraction)}
                y2={yOf(yMax * fraction)}
                stroke={colors.border}
                strokeWidth={1}
              />
            ))}
            {area && line ? (
              <>
                <Path d={area} fill={`url(#${gradientId})`} />
                <Path d={line} fill="none" stroke={colors.primaryText} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
              </>
            ) : null}
            <Line x1={points[index].x} x2={points[index].x} y1={points[index].y} y2={baseline} stroke={colors.primaryText} strokeWidth={1} strokeOpacity={0.6} />
            <Circle cx={points[index].x} cy={points[index].y} r={dotRadius} fill={colors.primaryText} stroke={colors.card} strokeWidth={2} />
          </Svg>
        ) : null}
        {STATS_CHART_GRID_FRACTIONS.filter((fraction) => fraction > 0).map((fraction) => (
          <AppText
            key={fraction}
            size="2xs"
            tone="secondary"
            style={{ position: "absolute", left: 0, top: yOf(yMax * fraction) + 2 }}
          >
            {formatAxisValue(yMax * fraction)}
          </AppText>
        ))}
        {width > 0 ? (
          <View
            pointerEvents="none"
            onLayout={(event) => setPillWidth(event.nativeEvent.layout.width)}
            style={{
              position: "absolute",
              left: pillLeft,
              top: pillTop,
              height: pillHeight,
              paddingHorizontal: SPACING.sm,
              borderRadius: RADIUS.full,
              justifyContent: "center",
              backgroundColor: colors.primary,
            }}
          >
            <AppText size="2xs" weight="semibold" numberOfLines={1} style={{ color: colors.primaryForeground }}>
              {formatAxisValue(current.value)}
            </AppText>
          </View>
        ) : null}
        <View {...panResponder.panHandlers} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
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
