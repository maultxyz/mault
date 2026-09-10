import { IDLE_THRESHOLD_MS } from "@/lib/constants/timing";
import { useEffect, useRef, useState } from "react";

export function useScanTimer(lastScannedAt: number | undefined, resetSignal: number) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const accumulated = useRef(0);
  const segmentStart = useRef<number | null>(null);
  const isActiveRef = useRef(false);

  useEffect(() => {
    segmentStart.current = null;
    accumulated.current = 0;
    isActiveRef.current = false;
    setIsActive(false);
    setElapsedMs(0);
  }, [resetSignal]);

  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => {
      if (segmentStart.current !== null) {
        setElapsedMs(accumulated.current + (Date.now() - segmentStart.current));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isActive]);

  useEffect(() => {
    if (lastScannedAt === undefined) return;

    if (!isActiveRef.current) {
      segmentStart.current = Date.now();
      isActiveRef.current = true;
      setIsActive(true);
    }

    const id = setTimeout(() => {
      if (segmentStart.current !== null) {
        accumulated.current += Date.now() - segmentStart.current;
        segmentStart.current = null;
      }
      isActiveRef.current = false;
      setIsActive(false);
    }, IDLE_THRESHOLD_MS);

    return () => clearTimeout(id);
  }, [lastScannedAt]);

  return { elapsedMs, isActive };
}
