import { loadPublicResource } from "@/features/landing/api/load-public-resource";
import type { PublicPricing } from "@/lib/interfaces/landing";
import { useEffect, useState } from "react";

export function usePublicPricing() {
  const [pricing, setPricing] = useState<PublicPricing | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadPublicResource<PublicPricing>("/api/public/pricing")
      .then((res) => {
        if (cancelled) return;
        setPricing(res.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setPricing(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return pricing;
}
