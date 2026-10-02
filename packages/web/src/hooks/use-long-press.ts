import {
  LONG_PRESS_DELAY_MS,
  LONG_PRESS_MOVE_TOLERANCE_PX,
  LONG_PRESS_VIBRATE_MS,
} from "@/lib/constants/gestures";
import type { PointerEvent } from "react";
import { useCallback, useEffect, useRef } from "react";

export function useLongPress(onLongPress: (() => void) | undefined) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    startRef.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  const handlers = onLongPress
    ? {
        onPointerDown: (event: PointerEvent) => {
          firedRef.current = false;
          startRef.current = { x: event.clientX, y: event.clientY };
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            firedRef.current = true;
            navigator.vibrate?.(LONG_PRESS_VIBRATE_MS);
            onLongPress();
          }, LONG_PRESS_DELAY_MS);
        },
        onPointerMove: (event: PointerEvent) => {
          const start = startRef.current;
          if (
            start &&
            Math.hypot(event.clientX - start.x, event.clientY - start.y) >
              LONG_PRESS_MOVE_TOLERANCE_PX
          ) {
            cancel();
          }
        },
        onPointerUp: cancel,
        onPointerLeave: cancel,
        onPointerCancel: cancel,
        onContextMenu: (event: { preventDefault: () => void }) =>
          event.preventDefault(),
      }
    : {};

  const consumeLongPress = useCallback(() => {
    const fired = firedRef.current;
    firedRef.current = false;
    return fired;
  }, []);

  return { handlers, consumeLongPress };
}
