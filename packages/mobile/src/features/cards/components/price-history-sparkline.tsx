import { indexAtX, sparklinePaths, sparklinePoints } from "@magic-vault/shared";
import { useId, useRef } from "react";
import { PanResponder, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { useTheme } from "@/hooks/use-theme";
import { CARD_PRICE_HISTORY_SPARKLINE } from "@/lib/constants/cards";
import type { PriceHistorySparklineProps } from "@/lib/interfaces/cards";

export function PriceHistorySparkline({
  values,
  selectedIndex,
  onSelectedIndexChange,
  accessibilityLabel,
  accessibilityValueText,
}: PriceHistorySparklineProps) {
  const colors = useTheme();
  const gradientId = useId();
  const { width, height, verticalPadding, strokeWidth, dotRadius } = CARD_PRICE_HISTORY_SPARKLINE;
  const countRef = useRef(values.length);
  const onChangeRef = useRef(onSelectedIndexChange);
  countRef.current = values.length;
  onChangeRef.current = onSelectedIndexChange;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: (event) => onChangeRef.current(indexAtX(event.nativeEvent.locationX, width, countRef.current)),
      onPanResponderMove: (event) => onChangeRef.current(indexAtX(event.nativeEvent.locationX, width, countRef.current)),
    }),
  ).current;

  const plotHeight = height - verticalPadding * 2;
  const paths = sparklinePaths(values, width, plotHeight, verticalPadding);
  const selectedPoint = sparklinePoints(values, width, plotHeight, verticalPadding)[selectedIndex];
  const lastIndex = values.length - 1;
  const step = (delta: number) => onSelectedIndexChange(Math.max(0, Math.min(lastIndex, selectedIndex + delta)));

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: accessibilityValueText }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) => step(event.nativeEvent.actionName === "increment" ? 1 : -1)}
      style={{ width, height, flexShrink: 0 }}
      {...panResponder.panHandlers}
    >
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primaryText} stopOpacity={0.22} />
            <Stop offset="1" stopColor={colors.primaryText} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {paths ? (
          <>
            <Path d={`${paths.line} L ${width} ${height} L 0 ${height} Z`} fill={`url(#${gradientId})`} />
            <Path
              d={paths.line}
              fill="none"
              stroke={colors.primaryText}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : null}
        {selectedPoint ? (
          <Circle
            cx={selectedPoint.x}
            cy={selectedPoint.y}
            r={dotRadius}
            fill={colors.primaryText}
            stroke={colors.card}
            strokeWidth={1.5}
          />
        ) : null}
      </Svg>
    </View>
  );
}
