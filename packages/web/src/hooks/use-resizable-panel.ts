import { useCallback, useEffect, useRef, useState } from "react";
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

  return { size, isDragging, onPointerDown };
}
