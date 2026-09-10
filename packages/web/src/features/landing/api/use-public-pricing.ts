import { apiGet } from "@/lib/api/client";
import type { PublicPricing } from "@/lib/interfaces/landing";
import type { Result } from "@magic-vault/shared";
import { useEffect, useState } from "react";

export type { PublicPricing };

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
