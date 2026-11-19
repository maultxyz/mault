import type {
  DraggableMarqueeOptions,
  MarqueeDrag,
} from "@/lib/interfaces/landing";
import { prefersReducedMotion } from "@/lib/motion";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";

export function useDraggableMarquee({
  secondsPerLoop,
  isPaused,
  isEnabled,
}: DraggableMarqueeOptions) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLUListElement>(null);
  const offsetRef = useRef(0);
  const isHoveredRef = useRef(false);
  const isPausedRef = useRef(isPaused);
  const dragRef = useRef<MarqueeDrag | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const applyOffset = useCallback(() => {
    const track = trackRef.current;
    const rowWidth = rowRef.current?.offsetWidth ?? 0;
    if (!track || rowWidth === 0) return;
    const wrapped = ((offsetRef.current % rowWidth) + rowWidth) % rowWidth;
    track.style.transform = `translate3d(${-wrapped}px, 0, 0)`;
  }, []);

  useEffect(() => {
    if (!isEnabled) return;
    const reducedMotion = prefersReducedMotion();
    let frame = 0;
    let lastTime = performance.now();
    const tick = (now: number) => {
      const elapsedSeconds = (now - lastTime) / 1000;
      lastTime = now;
      const rowWidth = rowRef.current?.offsetWidth ?? 0;
      const isMoving =
        !reducedMotion &&
        !isPausedRef.current &&
        !isHoveredRef.current &&
        !dragRef.current;
      if (isMoving && rowWidth > 0) {
        offsetRef.current += (rowWidth / secondsPerLoop) * elapsedSeconds;
      }
      applyOffset();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isEnabled, secondsPerLoop, applyOffset]);

  const nudge = useCallback(
    (distancePx: number) => {
      offsetRef.current += distancePx;
      applyOffset();
    },
    [applyOffset],
  );

  const pointerHandlers = {
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === "mouse") isHoveredRef.current = true;
    },
    onPointerLeave: () => {
      isHoveredRef.current = false;
    },
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startOffset: offsetRef.current,
      };
      setIsDragging(true);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      offsetRef.current = drag.startOffset - (event.clientX - drag.startX);
      applyOffset();
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      if (dragRef.current?.pointerId !== event.pointerId) return;
      dragRef.current = null;
      setIsDragging(false);
    },
    onPointerCancel: () => {
      dragRef.current = null;
      setIsDragging(false);
    },
  };

  return { trackRef, rowRef, isDragging, pointerHandlers, nudge };
}
