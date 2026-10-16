import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS } from "@/lib/constants/theme";
import { SKELETON_PULSE_MS } from "@/lib/constants/ui";
import type { SkeletonProps } from "@/lib/interfaces/ui";

export function Skeleton({ width = "100%", height, radius = RADIUS.md, style }: SkeletonProps) {
  const colors = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.5, duration: SKELETON_PULSE_MS, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: SKELETON_PULSE_MS, useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => loop?.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.muted, opacity }, style]}
    />
  );
}
