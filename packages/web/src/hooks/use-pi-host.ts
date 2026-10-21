import { isPiHost, isPiHostSettled, loadPiHost } from "@/lib/pi-host";
import { useEffect, useState } from "react";

export function usePiHostState(): { piHost: boolean; settled: boolean } {
  const [state, setState] = useState(() => ({
    piHost: isPiHost(),
    settled: isPiHostSettled(),
  }));

  useEffect(() => {
    let cancelled = false;
    void loadPiHost().then((value) => {
      if (!cancelled) setState({ piHost: value, settled: true });
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
