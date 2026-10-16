import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { roundedContourPath } from "@/features/scanner/lib/outline-path";
import type { DetectedOutlineProps } from "@/lib/interfaces/ui";

export function DetectedOutline({ corners, color }: DetectedOutlineProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width, height } = size;
  const shortSide = Math.min(width, height);
  const lineWidth = Math.max(3, Math.round(shortSide * 0.011));
  const radius = Math.max(4, Math.round(shortSide * 0.0148));
  const path =
    width > 0
      ? roundedContourPath(corners.contour, width / corners.frameWidth, height / corners.frameHeight, radius)
      : null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(event) => setSize(event.nativeEvent.layout)}>
      {path ? (
        <Svg width={width} height={height}>
          <Path d={path} fill="none" stroke={color} strokeWidth={lineWidth} strokeLinejoin="round" strokeLinecap="round" />
        </Svg>
      ) : null}
    </View>
  );
}
