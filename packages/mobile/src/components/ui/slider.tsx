import { useMemo, useRef, useState } from "react";
import { PanResponder, View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS } from "@/lib/constants/theme";
import { DISABLED_OPACITY, SLIDER_HIT_HEIGHT, SLIDER_THUMB_SIZE, SLIDER_TRACK_HEIGHT } from "@/lib/constants/ui";
import type { SliderProps } from "@/lib/interfaces/ui";

function clampToStep(value: number, min: number, max: number, step: number): number {
  const stepped = Math.round((value - min) / step) * step + min;
  return Math.min(max, Math.max(min, Number(stepped.toFixed(6))));
}

export function Slider({ value, min, max, step = 1, disabled = false, accessibilityLabel, onValueChange }: SliderProps) {
  const colors = useTheme();
  const [width, setWidth] = useState(0);
  const startXRef = useRef(0);
  const latest = useRef({ width, min, max, step, disabled, onValueChange, value });
  latest.current = { width, min, max, step, disabled, onValueChange, value };

  const valueAt = (x: number) => {
    const { width: w, min: lo, max: hi, step: s } = latest.current;
    if (w <= 0) return latest.current.value;
    const usable = w - SLIDER_THUMB_SIZE;
    const ratio = Math.min(1, Math.max(0, (x - SLIDER_THUMB_SIZE / 2) / usable));
    return clampToStep(lo + ratio * (hi - lo), lo, hi, s);
  };

  const emit = (next: number) => {
    if (next !== latest.current.value) latest.current.onValueChange(next);
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !latest.current.disabled,
        onMoveShouldSetPanResponder: () => !latest.current.disabled,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          startXRef.current = event.nativeEvent.locationX;
          emit(valueAt(startXRef.current));
        },
        onPanResponderMove: (_, gesture) => emit(valueAt(startXRef.current + gesture.dx)),
      }),
    [],
  );

  const range = max - min || 1;
  const ratio = Math.min(1, Math.max(0, (value - min) / range));
  const thumbLeft = ratio * Math.max(0, width - SLIDER_THUMB_SIZE);

  return (
    <View
      {...responder.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
      accessibilityState={{ disabled }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) => {
        if (disabled) return;
        const delta = event.nativeEvent.actionName === "increment" ? step : -step;
        emit(clampToStep(value + delta, min, max, step));
      }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ height: SLIDER_HIT_HEIGHT, justifyContent: "center", opacity: disabled ? DISABLED_OPACITY : 1 }}
    >
      <View
        pointerEvents="none"
        style={{
          height: SLIDER_TRACK_HEIGHT,
          marginHorizontal: SLIDER_THUMB_SIZE / 2,
          borderRadius: RADIUS.full,
          backgroundColor: colors.muted,
          overflow: "hidden",
        }}
      >
        <View style={{ width: `${ratio * 100}%`, height: "100%", backgroundColor: colors.primary }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: thumbLeft,
          width: SLIDER_THUMB_SIZE,
          height: SLIDER_THUMB_SIZE,
          borderRadius: RADIUS.full,
          backgroundColor: colors.background,
          borderWidth: 2,
          borderColor: colors.primary,
        }}
      />
    </View>
  );
}
