import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { BRAND_ICON_STROKE_PATHS, BRAND_ICON_VIEW_BOX } from "@magic-vault/shared";
import { useTheme } from "@/hooks/use-theme";
import {
  LOADING_LOGO_CYCLE_MS,
  LOADING_LOGO_DEFAULT_SIZE,
  LOADING_LOGO_LAYERS,
  LOADING_LOGO_VIEW_BOX_HEIGHT,
  LOADING_LOGO_VIEW_BOX_WIDTH,
} from "@/lib/constants/loading";
import type { LoadingLogoLayerViewProps, LoadingLogoProps } from "@/lib/interfaces/loading";

function LoadingLogoLayerView({
  layer,
  path,
  cycleProgress,
  width,
  height,
  color,
}: LoadingLogoLayerViewProps) {
  const pixelsPerUnit = height / LOADING_LOGO_VIEW_BOX_HEIGHT;
  const animatedStyle = useAnimatedStyle(() => {
    const progress = (((cycleProgress.value - layer.delayFraction) % 1) + 1) % 1;
    const stops = layer.keyframes.map((keyframe) => keyframe.at);
    const valueAt = (pick: (index: number) => number) =>
      interpolate(
        progress,
        stops,
        layer.keyframes.map((_, index) => pick(index)),
      );
    return {
      transform: [
        { translateY: valueAt((index) => layer.keyframes[index].translateY) * layer.boxHeight * pixelsPerUnit },
        { rotate: `${valueAt((index) => layer.keyframes[index].rotate)}deg` },
        { scaleX: valueAt((index) => layer.keyframes[index].scaleX) },
        { scaleY: valueAt((index) => layer.keyframes[index].scaleY) },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        { position: "absolute", inset: 0, transformOrigin: `${layer.originX} ${layer.originY}` },
        animatedStyle,
      ]}
    >
      <Svg width={width} height={height} viewBox={BRAND_ICON_VIEW_BOX}>
        <Path d={path} fill={color} />
      </Svg>
    </Animated.View>
  );
}

export function LoadingLogo({ size = LOADING_LOGO_DEFAULT_SIZE, color, accessibilityLabel }: LoadingLogoProps) {
  const colors = useTheme();
  const reduceMotion = useReducedMotion();
  const cycleProgress = useSharedValue(0);
  const width = size;
  const height = (size * LOADING_LOGO_VIEW_BOX_HEIGHT) / LOADING_LOGO_VIEW_BOX_WIDTH;

  useEffect(() => {
    if (reduceMotion) return;
    cycleProgress.value = withRepeat(
      withTiming(1, { duration: LOADING_LOGO_CYCLE_MS, easing: Easing.linear }),
      -1,
      false,
    );
  }, [cycleProgress, reduceMotion]);

  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? "progressbar" : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityLabel ? { busy: true } : undefined}
      importantForAccessibility={accessibilityLabel ? "yes" : "no-hide-descendants"}
      style={{ width, height }}
    >
      {LOADING_LOGO_LAYERS.map((layer, index) => (
        <LoadingLogoLayerView
          key={BRAND_ICON_STROKE_PATHS[index]}
          layer={layer}
          path={BRAND_ICON_STROKE_PATHS[index]}
          cycleProgress={cycleProgress}
          width={width}
          height={height}
          color={color ?? colors.foreground}
        />
      ))}
    </View>
  );
}
