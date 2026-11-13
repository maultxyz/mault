import type { PiHostState } from "@/lib/interfaces/nav";
import {
  isPiController,
  isPiHost,
  isPiHostSettled,
  loadPiHost,
} from "@/lib/pi-host";
import { useEffect, useState } from "react";

export function usePiHostState(): PiHostState {
  const [state, setState] = useState<PiHostState>(() => ({
    piHost: isPiHost(),
    piSorter: isPiController(),
    settled: isPiHostSettled(),
  }));

  useEffect(() => {
    let cancelled = false;
    void loadPiHost().then((value) => {
      if (!cancelled) {
        setState({ piHost: value, piSorter: isPiController(), settled: true });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export function usePiHost(): boolean {
  return usePiHostState().piHost;
}
