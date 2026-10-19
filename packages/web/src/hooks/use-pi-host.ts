import { isPiHost, loadPiHost } from "@/lib/pi-host";
import { useEffect, useState } from "react";

export function usePiHost(): boolean {
  const [piHost, setPiHost] = useState(isPiHost);

  useEffect(() => {
    let cancelled = false;
    void loadPiHost().then((value) => {
      if (!cancelled) setPiHost(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return piHost;
}
