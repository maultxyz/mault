import { DEMO_COUNT_UP_DURATION_MS } from "@/lib/constants/landing";
import { prefersReducedMotion } from "@/lib/motion";
import { useEffect, useState } from "react";

export function useCountUp(
  targetValue: number,
  isCounting: boolean,
  durationMs = DEMO_COUNT_UP_DURATION_MS,
): number {
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    if (!isCounting) return;
    if (prefersReducedMotion()) {
      setCurrentValue(targetValue);
      return;
    }
    const startedAt = performance.now();
    let animationFrameId = 0;
    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      setCurrentValue(targetValue * (1 - (1 - progress) ** 3));
      if (progress < 1) animationFrameId = requestAnimationFrame(step);
    };
    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetValue, isCounting, durationMs]);

  return currentValue;
}
