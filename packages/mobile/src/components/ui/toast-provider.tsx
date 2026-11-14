import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { SCREEN_GUTTER, SPACING, SURFACE_RADIUS } from "@/lib/constants/theme";
import {
  TOAST_BOTTOM_OFFSET,
  TOAST_DEFAULT_DURATION_MS,
  TOAST_FADE_MS,
  TOAST_SCREEN_READER_DURATION_MULTIPLIER,
} from "@/lib/constants/ui";
import type { ToastContextValue, ToastOptions, ToastProviderProps } from "@/lib/interfaces/ui";

const ToastContext = createContext<ToastContextValue>({ showToast: () => {}, dismissToast: () => {} });

interface VisibleToast extends ToastOptions {
  toastId: number;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<VisibleToast | null>(null);
  const toastRef = useRef<VisibleToast | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingMsRef = useRef(0);
  const startedAtRef = useRef(0);
  const nextToastIdRef = useRef(1);
  const opacity = useRef(new Animated.Value(0)).current;

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const finish = useCallback(
    (actionTaken: boolean) => {
      clearTimer();
      const current = toastRef.current;
      toastRef.current = null;
      setToast(null);
      if (current && !actionTaken) current.onExpire?.();
    },
    [],
  );

  const startTimer = useCallback(
    (durationMs: number) => {
      clearTimer();
      remainingMsRef.current = durationMs;
      startedAtRef.current = Date.now();
      timerRef.current = setTimeout(() => finish(false), durationMs);
    },
    [finish],
  );

  const showToast = useCallback(
    (options: ToastOptions) => {
      if (toastRef.current) finish(false);
      const next: VisibleToast = { ...options, toastId: nextToastIdRef.current++ };
      toastRef.current = next;
      setToast(next);
      AccessibilityInfo.announceForAccessibility(
        options.action ? `${options.message}. ${options.action.label}` : options.message,
      );
      void AccessibilityInfo.isScreenReaderEnabled().then((screenReaderOn) => {
        if (toastRef.current?.toastId !== next.toastId) return;
        const baseDurationMs = options.durationMs ?? TOAST_DEFAULT_DURATION_MS;
        startTimer(screenReaderOn ? baseDurationMs * TOAST_SCREEN_READER_DURATION_MULTIPLIER : baseDurationMs);
      });
    },
    [finish, startTimer],
  );

  const pauseTimer = () => {
    if (!timerRef.current) return;
    clearTimer();
    remainingMsRef.current = Math.max(0, remainingMsRef.current - (Date.now() - startedAtRef.current));
  };
  const resumeTimer = () => {
    if (toastRef.current && !timerRef.current) startTimer(Math.max(remainingMsRef.current, TOAST_FADE_MS * 4));
  };

  useEffect(() => {
    if (!toast) return;
    opacity.setValue(0);
    let animation: Animated.CompositeAnimation | null = null;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) {
        opacity.setValue(1);
        return;
      }
      animation = Animated.timing(opacity, { toValue: 1, duration: TOAST_FADE_MS, useNativeDriver: true });
      animation.start();
    });
    return () => animation?.stop();
  }, [toast, opacity]);

  useEffect(() => () => clearTimer(), []);

  const value = useMemo(() => ({ showToast, dismissToast: () => finish(false) }), [showToast, finish]);
  const toneColor =
    toast?.tone === "destructive" ? colors.destructive : toast?.tone === "success" ? colors.successForeground : colors.foreground;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View
          pointerEvents="box-none"
          style={{ position: "absolute", left: SCREEN_GUTTER, right: SCREEN_GUTTER, bottom: insets.bottom + TOAST_BOTTOM_OFFSET }}
        >
          <Animated.View style={{ opacity }}>
            <Pressable
              accessibilityRole="alert"
              onPressIn={pauseTimer}
              onPressOut={resumeTimer}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: SPACING.md,
                paddingHorizontal: SPACING.lg,
                paddingVertical: SPACING.md,
                borderRadius: SURFACE_RADIUS,
                borderCurve: "continuous",
                backgroundColor: colors.card,
                shadowColor: colors.popoverShadow,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 1,
                shadowRadius: 16,
                elevation: 6,
              }}
            >
              <AppText size="sm" weight="medium" style={{ flex: 1, color: toneColor }}>
                {toast.message}
              </AppText>
              {toast.action ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={toast.action.label}
                  hitSlop={SPACING.sm}
                  onPress={() => {
                    const action = toast.action;
                    finish(true);
                    action?.onPress();
                  }}
                >
                  <AppText size="sm" weight="bold" style={{ color: colors.primaryText }}>
                    {toast.action.label}
                  </AppText>
                </Pressable>
              ) : null}
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}
