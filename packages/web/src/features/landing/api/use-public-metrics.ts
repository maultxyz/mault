import { loadPublicResource } from "@/features/landing/api/load-public-resource";
import type { PublicMetrics } from "@magic-vault/shared";
import { useEffect, useState } from "react";

export function usePublicMetrics() {
  const [metrics, setMetrics] = useState<PublicMetrics | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadPublicResource<PublicMetrics>("/api/public/metrics")
      .then((res) => {
        if (!cancelled && res.data) setMetrics(res.data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return metrics;
}
