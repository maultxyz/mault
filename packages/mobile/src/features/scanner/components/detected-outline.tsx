import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSmoothedCorners } from "@/features/scanner/api/use-smoothed-corners";
import { roundedContourPath } from "@/features/scanner/lib/outline-path";
import type { DetectedOutlineProps } from "@/lib/interfaces/ui";

export function DetectedOutline({ corners: target, color }: DetectedOutlineProps) {
  const corners = useSmoothedCorners(target);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width, height } = size;
  const shortSide = Math.min(width, height);
  const lineWidth = Math.max(3, Math.round(shortSide * 0.011));
  const radius = Math.max(4, Math.round(shortSide * 0.0148));
  const path =
    width > 0 && corners
      ? roundedContourPath(corners.contour, width / corners.frameWidth, height / corners.frameHeight, radius)
      : null;

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { opacity: corners?.opacity ?? 0 }]}
      onLayout={(event) => setSize(event.nativeEvent.layout)}
    >
      {path ? (
        <Svg width={width} height={height}>
          <Path d={path} fill="none" stroke={color} strokeWidth={lineWidth} strokeLinejoin="round" strokeLinecap="round" />
        </Svg>
      ) : null}
    </View>
  );
}
