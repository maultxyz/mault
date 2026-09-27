import { useEffect, useRef, useState } from "react";

export function useScanTimer(isRunning: boolean, resetSignal: number) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const accumulated = useRef(0);
  const segmentStart = useRef<number | null>(null);

  useEffect(() => {
    accumulated.current = 0;
    segmentStart.current = segmentStart.current === null ? null : Date.now();
    setElapsedMs(0);
  }, [resetSignal]);

  useEffect(() => {
    if (!isRunning) return;
    segmentStart.current = Date.now();
    const id = setInterval(() => {
      if (segmentStart.current !== null) {
        setElapsedMs(accumulated.current + (Date.now() - segmentStart.current));
      }
    }, 1000);
    return () => {
      clearInterval(id);
      if (segmentStart.current !== null) {
        accumulated.current += Date.now() - segmentStart.current;
        segmentStart.current = null;
      }
      setElapsedMs(accumulated.current);
    };
  }, [isRunning]);

  return { elapsedMs, isActive: isRunning };
}
