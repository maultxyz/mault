import { apiGet } from "@/lib/api/client";
import type { Result } from "@magic-vault/shared";
import { useEffect, useState } from "react";

export interface PublicPricing {
  business: { amount: number; currency: string; interval: string } | null;
  freeDailyScanLimit: number;
}

export function usePublicPricing() {
  const [pricing, setPricing] = useState<PublicPricing | null>(null);

  useEffect(() => {
    let cancelled = false;

    apiGet<Result<PublicPricing>>("/api/public/pricing")
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
