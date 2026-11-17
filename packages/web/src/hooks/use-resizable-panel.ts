import { useCallback, useEffect, useRef, useState } from "react";
import {
  RESIZE_HANDLE_KEYBOARD_LARGE_STEP_PX,
  RESIZE_HANDLE_KEYBOARD_STEP_PX,
} from "@/lib/constants/resize-handle";
import type { UseResizablePanelOptions } from "@/lib/interfaces/layout";

export function useResizablePanel({
  axis,
  defaultSize,
  min,
  max,
  storageKey,
  invert = false,
}: UseResizablePanelOptions) {
  const [size, setSize] = useState(() => {
    const stored = Number(localStorage.getItem(storageKey));
    return Number.isFinite(stored) && stored > 0
      ? Math.min(max, Math.max(min, stored))
      : defaultSize;
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ pos: 0, size: 0 });

  const clamp = useCallback(
    (value: number) => Math.min(max, Math.max(min, value)),
    [min, max],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragStart.current = {
        pos: axis === "width" ? e.clientX : e.clientY,
        size,
      };
      setIsDragging(true);
      e.preventDefault();
    },
    [axis, size],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const decreaseKey = axis === "width" ? "ArrowLeft" : "ArrowUp";
      const increaseKey = axis === "width" ? "ArrowRight" : "ArrowDown";
      const step = e.shiftKey
        ? RESIZE_HANDLE_KEYBOARD_LARGE_STEP_PX
        : RESIZE_HANDLE_KEYBOARD_STEP_PX;
      const direction = invert ? -1 : 1;
      if (e.key === increaseKey) {
        setSize((current) => clamp(current + step * direction));
      } else if (e.key === decreaseKey) {
        setSize((current) => clamp(current - step * direction));
      } else if (e.key === "Home") {
        setSize(min);
      } else if (e.key === "End") {
        setSize(max);
      } else {
        return;
      }
      e.preventDefault();
    },
    [axis, invert, clamp, min, max],
  );

  useEffect(() => {
    if (!isDragging) return;

    function handleMove(e: PointerEvent) {
      const pos = axis === "width" ? e.clientX : e.clientY;
      const delta = pos - dragStart.current.pos;
      setSize(clamp(dragStart.current.size + (invert ? -delta : delta)));
    }
    function handleUp() {
      setIsDragging(false);
    }

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
    return () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
    };
  }, [isDragging, axis, invert, clamp]);

  useEffect(() => {
    localStorage.setItem(storageKey, String(size));
  }, [size, storageKey]);

  return {
    size,
    isDragging,
    onPointerDown,
    onKeyDown,
    valueMin: min,
    valueMax: max,
  };
}
