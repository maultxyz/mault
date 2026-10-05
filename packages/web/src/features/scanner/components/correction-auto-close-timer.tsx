import {
  CORRECTION_AUTO_CLOSE_DONE_DELAY_MS,
  CORRECTION_AUTO_CLOSE_TICK_MS,
  CORRECTION_TIMER_CIRCUMFERENCE,
  CORRECTION_TIMER_RADIUS,
} from "@/lib/constants/scanner";
import type { CorrectionAutoCloseTimerProps } from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import { IconCheck } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export function CorrectionAutoCloseTimer({
  seconds,
  willMove,
  onElapsed,
}: CorrectionAutoCloseTimerProps) {
  const { t } = useTranslation("scanner");
  const totalMs = seconds * 1000;
  const [elapsedMs, setElapsedMs] = useState(0);
  const isDone = elapsedMs >= totalMs;
  const onElapsedRef = useRef(onElapsed);

  useEffect(() => {
    onElapsedRef.current = onElapsed;
  });

  useEffect(() => {
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const next = Math.min(Date.now() - startedAt, totalMs);
      setElapsedMs(next);
      if (next >= totalMs) clearInterval(interval);
    }, CORRECTION_AUTO_CLOSE_TICK_MS);
    return () => clearInterval(interval);
  }, [totalMs]);

  useEffect(() => {
    if (!isDone) return;
    const timeout = setTimeout(
      () => onElapsedRef.current(),
      CORRECTION_AUTO_CLOSE_DONE_DELAY_MS,
    );
    return () => clearTimeout(timeout);
  }, [isDone]);

  const progress = elapsedMs / totalMs;
  const remaining = Math.ceil((totalMs - elapsedMs) / 1000);
  const label = isDone
    ? t(
        willMove
          ? "binCorrection.autoClose.doneMoved"
          : "binCorrection.autoClose.done",
      )
    : t(
        willMove
          ? "binCorrection.autoClose.countdownMoved"
          : "binCorrection.autoClose.countdown",
        { count: remaining },
      );

  return (
    <div className="flex flex-col items-center gap-1" aria-live="polite">
      <div className="relative size-10 shrink-0">
        <svg viewBox="0 0 36 36" className="size-10 -rotate-90" aria-hidden>
          <circle
            cx="18"
            cy="18"
            r={CORRECTION_TIMER_RADIUS}
            fill="none"
            strokeWidth="3"
            className="stroke-muted"
          />
          <circle
            cx="18"
            cy="18"
            r={CORRECTION_TIMER_RADIUS}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={CORRECTION_TIMER_CIRCUMFERENCE}
            strokeDashoffset={CORRECTION_TIMER_CIRCUMFERENCE * (1 - progress)}
            className={cn(
              "transition-[stroke-dashoffset,stroke] duration-100 ease-linear motion-reduce:transition-none",
              isDone ? "stroke-success" : "stroke-primary",
            )}
          />
        </svg>
        <IconCheck
          className={cn(
            "absolute inset-0 m-auto size-5 transition-colors motion-reduce:transition-none",
            isDone ? "text-success" : "text-foreground/70",
          )}
        />
      </div>
      <span className="text-center text-xs text-foreground/70">{label}</span>
    </div>
  );
}
