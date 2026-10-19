import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "react-native-reanimated";
import { isOutlineSettled, stepOutline, type OutlineAnimationState } from "@magic-vault/shared";
import type { LiveCorners, SmoothedCorners } from "@/lib/interfaces/scanner";

export function useSmoothedCorners(target: LiveCorners | null): SmoothedCorners | null {
  const reduceMotion = useReducedMotion();
  const [smoothed, setSmoothed] = useState<SmoothedCorners | null>(null);
  const stateRef = useRef<OutlineAnimationState>({ contour: null, opacity: 0 });
  const frameSizeRef = useRef({ frameWidth: 1, frameHeight: 1 });

  useEffect(() => {
    if (target) frameSizeRef.current = { frameWidth: target.frameWidth, frameHeight: target.frameHeight };
    const goal = target?.contour ?? null;
    let frame = 0;
    let lastTime = 0;
    const step = (now: number) => {
      const dt = lastTime ? now - lastTime : 16;
      lastTime = now;
      const next = stepOutline(stateRef.current, goal, dt, reduceMotion);
      const settled = isOutlineSettled(next, goal);
      stateRef.current = settled ? { contour: goal, opacity: goal ? 1 : 0 } : next;
      const { contour, opacity } = stateRef.current;
      setSmoothed(contour && opacity > 0.01 ? { ...frameSizeRef.current, contour, opacity } : null);
      if (!settled) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, reduceMotion]);

  return smoothed;
}
