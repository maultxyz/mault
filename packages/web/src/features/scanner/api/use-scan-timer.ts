import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type {
  ScanTimerStore,
  WritableScanTimerStore,
} from "@/lib/interfaces/scanner";

function createScanTimerStore(): WritableScanTimerStore {
  let elapsedMs = 0;
  const listeners = new Set<() => void>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => elapsedMs,
    set(nextElapsedMs) {
      if (nextElapsedMs === elapsedMs) return;
      elapsedMs = nextElapsedMs;
      for (const listener of listeners) listener();
    },
  };
}

function subscribeToNothing() {
  return () => {};
}

export function useScanTimerElapsedMs(
  store: ScanTimerStore,
  isLive = true,
): number {
  return useSyncExternalStore(
    isLive ? store.subscribe : subscribeToNothing,
    store.getSnapshot,
  );
}

export function useScanTimer(isRunning: boolean, resetSignal: number) {
  const [store] = useState(createScanTimerStore);
  const setElapsedMs = store.set;
  const accumulated = useRef(0);
  const segmentStart = useRef<number | null>(null);

  useEffect(() => {
    accumulated.current = 0;
    segmentStart.current = segmentStart.current === null ? null : Date.now();
    setElapsedMs(0);
  }, [resetSignal, setElapsedMs]);

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
  }, [isRunning, setElapsedMs]);

  return { store: store as ScanTimerStore, isActive: isRunning };
}
