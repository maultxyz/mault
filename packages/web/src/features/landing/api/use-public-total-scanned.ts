import { getPublicMetrics } from "@/lib/api/admin";
import { useEffect, useState } from "react";

export function usePublicTotalScanned() {
  const [totalScanned, setTotalScanned] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    getPublicMetrics()
      .then((res) => {
        if (!cancelled && res.data) setTotalScanned(res.data.totalScanned);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return totalScanned;
}
