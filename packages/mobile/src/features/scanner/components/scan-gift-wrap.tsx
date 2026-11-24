import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import {
  SCAN_GIFT_REVEAL_HIGHLIGHT_MS,
  SCAN_GIFT_REVEAL_UNWRAP_MS,
  SCAN_GIFT_REVEAL_WIGGLE_MS,
} from "@magic-vault/shared";
import { Icon } from "@/components/ui/icon";
import {
  markScanGiftUnwrapped,
  useWrappedScanGiftReveal,
} from "@/features/scanner/lib/scan-gift-reveal-store";
import {
  SCAN_GIFT_REVEAL_COLORS,
  SCAN_GIFT_WRAP_BOW_HEIGHT,
  SCAN_GIFT_WRAP_BOW_RISE,
  SCAN_GIFT_WRAP_BOW_WIDTH,
  SCAN_GIFT_WRAP_GLOW_FADE_MS,
  SCAN_GIFT_WRAP_GLOW_INSET,
  SCAN_GIFT_WRAP_HALF_ROTATION_DEGREES,
  SCAN_GIFT_WRAP_HALF_TRAVEL,
  SCAN_GIFT_WRAP_RIBBON_WIDTH,
  SCAN_GIFT_WRAP_SPARKLE_MS,
  SCAN_GIFT_WRAP_SPARKLE_SIZE,
  SCAN_GIFT_WRAP_SPARKLES,
  SCAN_GIFT_WRAP_WIGGLE_DEGREES,
} from "@/lib/constants/scan-gift-reveal";
import { CARD_THUMBNAIL_RADIUS } from "@/lib/constants/theme";
import type { ScanGiftWrapProps, ScanGiftWrapSparkleProps } from "@/lib/interfaces/scanner";

function GiftWrapSparkle({ progress, offsetX, offsetY }: ScanGiftWrapSparkleProps) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.3, 1], [0, 1, 0]),
    transform: [
      { translateX: offsetX * progress.value },
      { translateY: offsetY * progress.value },
      { scale: 0.4 + 0.6 * progress.value },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: "50%",
          top: "50%",
          marginLeft: -SCAN_GIFT_WRAP_SPARKLE_SIZE / 2,
          marginTop: -SCAN_GIFT_WRAP_SPARKLE_SIZE / 2,
        },
        style,
      ]}
    >
      <Icon name="sparkles" size={SCAN_GIFT_WRAP_SPARKLE_SIZE} color={SCAN_GIFT_REVEAL_COLORS.ribbon} />
    </Animated.View>
  );
}

export function ScanGiftWrap({ scanId, isVisible, children }: ScanGiftWrapProps) {
  const reduceMotion = useReducedMotion();
  const wrappedReveal = useWrappedScanGiftReveal(scanId);
  const [unwrappingScanId, setUnwrappingScanId] = useState<string | null>(null);
  if (isVisible && wrappedReveal && unwrappingScanId !== wrappedReveal.scanId) {
    setUnwrappingScanId(wrappedReveal.scanId);
  }
  const activeScanId = unwrappingScanId != null && unwrappingScanId === scanId ? unwrappingScanId : null;
  const wiggle = useSharedValue(0);
  const unwrap = useSharedValue(0);
  const glow = useSharedValue(0);
  const sparkle = useSharedValue(0);

  useEffect(() => {
    if (!activeScanId) return;
    const finish = () => {
      markScanGiftUnwrapped(activeScanId);
      setUnwrappingScanId((current) => (current === activeScanId ? null : current));
    };
    const playHaptic = () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    };
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (reduceMotion) {
      unwrap.value = 1;
      sparkle.value = 0;
      glow.value = 1;
      playHaptic();
      timers.push(setTimeout(finish, SCAN_GIFT_REVEAL_HIGHLIGHT_MS));
    } else {
      unwrap.value = 0;
      sparkle.value = 0;
      glow.value = 0;
      const wiggleStep = { duration: SCAN_GIFT_REVEAL_WIGGLE_MS / SCAN_GIFT_WRAP_WIGGLE_DEGREES.length };
      wiggle.value = withSequence(
        ...SCAN_GIFT_WRAP_WIGGLE_DEGREES.map((degrees) => withTiming(degrees, wiggleStep)),
      );
      unwrap.value = withDelay(
        SCAN_GIFT_REVEAL_WIGGLE_MS,
        withTiming(1, { duration: SCAN_GIFT_REVEAL_UNWRAP_MS, easing: Easing.out(Easing.cubic) }),
      );
      const highlightStartMs = SCAN_GIFT_REVEAL_WIGGLE_MS + SCAN_GIFT_REVEAL_UNWRAP_MS / 2;
      sparkle.value = withDelay(highlightStartMs, withTiming(1, { duration: SCAN_GIFT_WRAP_SPARKLE_MS }));
      glow.value = withDelay(
        highlightStartMs,
        withSequence(
          withTiming(1, { duration: SCAN_GIFT_WRAP_GLOW_FADE_MS }),
          withDelay(
            SCAN_GIFT_REVEAL_UNWRAP_MS / 2 + SCAN_GIFT_REVEAL_HIGHLIGHT_MS - 2 * SCAN_GIFT_WRAP_GLOW_FADE_MS,
            withTiming(0, { duration: SCAN_GIFT_WRAP_GLOW_FADE_MS }),
          ),
        ),
      );
      timers.push(setTimeout(playHaptic, SCAN_GIFT_REVEAL_WIGGLE_MS));
      timers.push(
        setTimeout(finish, SCAN_GIFT_REVEAL_WIGGLE_MS + SCAN_GIFT_REVEAL_UNWRAP_MS + SCAN_GIFT_REVEAL_HIGHLIGHT_MS),
      );
    }
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimation(wiggle);
      wiggle.value = 0;
    };
  }, [activeScanId, glow, reduceMotion, sparkle, unwrap, wiggle]);

  const wiggleStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${wiggle.value}deg` }] }));
  const paperOpacity = (progress: number) => {
    "worklet";
    return interpolate(progress, [0, 0.4, 1], [1, 1, 0], Extrapolation.CLAMP);
  };
  const leftHalfStyle = useAnimatedStyle(() => ({
    opacity: paperOpacity(unwrap.value),
    transform: [
      { translateX: -SCAN_GIFT_WRAP_HALF_TRAVEL * unwrap.value },
      { rotate: `${-SCAN_GIFT_WRAP_HALF_ROTATION_DEGREES * unwrap.value}deg` },
    ],
  }));
  const rightHalfStyle = useAnimatedStyle(() => ({
    opacity: paperOpacity(unwrap.value),
    transform: [
      { translateX: SCAN_GIFT_WRAP_HALF_TRAVEL * unwrap.value },
      { rotate: `${SCAN_GIFT_WRAP_HALF_ROTATION_DEGREES * unwrap.value}deg` },
    ],
  }));
  const bowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(unwrap.value, [0, 0.5], [1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: -SCAN_GIFT_WRAP_BOW_RISE * unwrap.value },
      { scale: 1 + 0.8 * unwrap.value },
    ],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  const paperHalfStyle = {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "50%",
    backgroundColor: SCAN_GIFT_REVEAL_COLORS.wrapping,
    borderColor: SCAN_GIFT_REVEAL_COLORS.wrappingShade,
    borderWidth: 1,
  } as const;
  const horizontalRibbonStyle = {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: SCAN_GIFT_WRAP_RIBBON_WIDTH,
    marginTop: -SCAN_GIFT_WRAP_RIBBON_WIDTH / 2,
    backgroundColor: SCAN_GIFT_REVEAL_COLORS.ribbon,
  } as const;
  const bowLoopStyle = {
    position: "absolute",
    top: 0,
    width: SCAN_GIFT_WRAP_BOW_WIDTH / 2,
    height: SCAN_GIFT_WRAP_BOW_HEIGHT,
    borderRadius: SCAN_GIFT_WRAP_BOW_HEIGHT / 2,
    borderWidth: 2,
    borderColor: SCAN_GIFT_REVEAL_COLORS.ribbon,
  } as const;

  return (
    <Animated.View style={wiggleStyle}>
      {children}
      {activeScanId ? (
        <View
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <Animated.View
            style={[
              {
                position: "absolute",
                top: -SCAN_GIFT_WRAP_GLOW_INSET,
                left: -SCAN_GIFT_WRAP_GLOW_INSET,
                right: -SCAN_GIFT_WRAP_GLOW_INSET,
                bottom: -SCAN_GIFT_WRAP_GLOW_INSET,
                borderRadius: CARD_THUMBNAIL_RADIUS + SCAN_GIFT_WRAP_GLOW_INSET,
                borderWidth: 2,
                borderColor: SCAN_GIFT_REVEAL_COLORS.ribbon,
                shadowColor: SCAN_GIFT_REVEAL_COLORS.ribbon,
                shadowOpacity: 0.9,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 0 },
              },
              glowStyle,
            ]}
          />
          {reduceMotion ? null : (
            <>
              <Animated.View
                style={[
                  paperHalfStyle,
                  {
                    left: 0,
                    borderRightWidth: 0,
                    borderTopLeftRadius: CARD_THUMBNAIL_RADIUS,
                    borderBottomLeftRadius: CARD_THUMBNAIL_RADIUS,
                  },
                  leftHalfStyle,
                ]}
              >
                <View style={horizontalRibbonStyle} />
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    right: 0,
                    width: SCAN_GIFT_WRAP_RIBBON_WIDTH / 2,
                    backgroundColor: SCAN_GIFT_REVEAL_COLORS.ribbon,
                  }}
                />
              </Animated.View>
              <Animated.View
                style={[
                  paperHalfStyle,
                  {
                    right: 0,
                    borderLeftWidth: 0,
                    borderTopRightRadius: CARD_THUMBNAIL_RADIUS,
                    borderBottomRightRadius: CARD_THUMBNAIL_RADIUS,
                  },
                  rightHalfStyle,
                ]}
              >
                <View style={horizontalRibbonStyle} />
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: SCAN_GIFT_WRAP_RIBBON_WIDTH / 2,
                    backgroundColor: SCAN_GIFT_REVEAL_COLORS.ribbon,
                  }}
                />
              </Animated.View>
              <Animated.View
                style={[
                  {
                    position: "absolute",
                    top: -SCAN_GIFT_WRAP_BOW_HEIGHT / 2,
                    left: "50%",
                    marginLeft: -SCAN_GIFT_WRAP_BOW_WIDTH / 2,
                    width: SCAN_GIFT_WRAP_BOW_WIDTH,
                    height: SCAN_GIFT_WRAP_BOW_HEIGHT,
                  },
                  bowStyle,
                ]}
              >
                <View style={[bowLoopStyle, { left: 0, transform: [{ rotate: "-20deg" }] }]} />
                <View style={[bowLoopStyle, { right: 0, transform: [{ rotate: "20deg" }] }]} />
                <View
                  style={{
                    position: "absolute",
                    top: SCAN_GIFT_WRAP_BOW_HEIGHT / 2 - SCAN_GIFT_WRAP_RIBBON_WIDTH / 2,
                    left: SCAN_GIFT_WRAP_BOW_WIDTH / 2 - SCAN_GIFT_WRAP_RIBBON_WIDTH / 2,
                    width: SCAN_GIFT_WRAP_RIBBON_WIDTH,
                    height: SCAN_GIFT_WRAP_RIBBON_WIDTH,
                    borderRadius: SCAN_GIFT_WRAP_RIBBON_WIDTH / 2,
                    backgroundColor: SCAN_GIFT_REVEAL_COLORS.ribbonShade,
                  }}
                />
              </Animated.View>
              {SCAN_GIFT_WRAP_SPARKLES.map((sparkleOffset) => (
                <GiftWrapSparkle
                  key={`${sparkleOffset.x}-${sparkleOffset.y}`}
                  progress={sparkle}
                  offsetX={sparkleOffset.x}
                  offsetY={sparkleOffset.y}
                />
              ))}
            </>
          )}
        </View>
      ) : null}
    </Animated.View>
  );
}
