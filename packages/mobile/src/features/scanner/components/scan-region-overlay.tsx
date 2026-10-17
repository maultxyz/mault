import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, Mask, Rect } from "react-native-svg";
import { getDefaultCardContour } from "@magic-vault/shared";
import { useTheme } from "@/hooks/use-theme";
import { SPACING } from "@/lib/constants/theme";
import {
  SCAN_REGION_MASK_OPACITY,
  SCAN_REGION_STROKE_OPACITY,
  SCAN_REGION_VIRTUAL_HEIGHT,
  SVG_MASK_HIDE,
  SVG_MASK_SHOW,
} from "@/lib/constants/scanner";
import type { ScanRegionOverlayProps } from "@/lib/interfaces/ui";

export function ScanRegionOverlay({ region, frameAspect, strokeColor }: ScanRegionOverlayProps) {
  const colors = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width, height } = size;

  const frameH = SCAN_REGION_VIRTUAL_HEIGHT;
  const frameW = frameH * frameAspect;
  const contour = getDefaultCardContour(frameW, frameH, region);
  const scale = Math.max(width / frameW, height / frameH);
  const offsetX = (width - frameW * scale) / 2;
  const offsetY = (height - frameH * scale) / 2;
  const shortSide = Math.min(width, height);
  const inset = SPACING.md;
  const left = Math.max(inset, offsetX + contour.topLeft.x * scale);
  const top = Math.max(inset, offsetY + contour.topLeft.y * scale);
  const right = Math.min(width - inset, offsetX + contour.bottomRight.x * scale);
  const bottom = Math.min(height - inset, offsetY + contour.bottomRight.y * scale);
  const x = left;
  const y = top;
  const boxW = Math.max(0, right - left);
  const boxH = Math.max(0, bottom - top);
  const radius = Math.max(6, Math.round(shortSide * 0.025));
  const lineWidth = Math.max(2, Math.round(shortSide * 0.006));

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(event) => setSize(event.nativeEvent.layout)}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <Mask id="scan-region-mask">
              <Rect x={0} y={0} width={width} height={height} fill={SVG_MASK_SHOW} />
              <Rect x={x} y={y} width={boxW} height={boxH} rx={radius} ry={radius} fill={SVG_MASK_HIDE} />
            </Mask>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill={colors.camera}
            fillOpacity={SCAN_REGION_MASK_OPACITY}
            mask="url(#scan-region-mask)"
          />
          <Rect
            x={x}
            y={y}
            width={boxW}
            height={boxH}
            rx={radius}
            ry={radius}
            fill="none"
            stroke={strokeColor}
            strokeOpacity={SCAN_REGION_STROKE_OPACITY}
            strokeWidth={lineWidth}
          />
        </Svg>
      ) : null}
    </View>
  );
}
