import { queryOptions } from "@tanstack/react-query";
import type { CardPricesUpdateResult, CardPricing, CardSellPriceRequest, Result } from "@magic-vault/shared";
import { apiGet, apiPut, unwrap } from "@/lib/api/client";
import { BUSINESS_CARD_PRICING_QUERY_KEY } from "@/lib/constants/business";
import { QUERY_STALE_MS } from "@/lib/constants/query";

export const cardPricingQueryOptions = (orgId: string | null | undefined, scanId: string, enabled: boolean) =>
  queryOptions({
    queryKey: [...BUSINESS_CARD_PRICING_QUERY_KEY, orgId, scanId] as const,
    queryFn: () => unwrap(apiGet<Result<CardPricing>>(`/api/business/cards/${scanId}/pricing`)),
    enabled: enabled && !!orgId && !!scanId,
    staleTime: QUERY_STALE_MS,
  });

export function setCardSellPrice(request: CardSellPriceRequest): Promise<CardPricesUpdateResult> {
  return unwrap(apiPut<Result<CardPricesUpdateResult>>("/api/business/cards/sell-price", request));
}
