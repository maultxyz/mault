import type { Result, TradeOffer } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, unwrap } from "@/lib/api/client";
import { QUERY_STALE_MS } from "@/lib/constants/query";
import { TRADE_OFFERS_QUERY_KEY } from "@/lib/constants/trade-offers";

export const pendingTradeOffersQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: [TRADE_OFFERS_QUERY_KEY, orgId, "pending"] as const,
    queryFn: () => unwrap(apiGet<Result<TradeOffer[]>>("/api/trade-offers?status=pending")),
    enabled: !!orgId,
    staleTime: QUERY_STALE_MS,
  });

export function respondToTradeOffer(guid: string, accepts: boolean): Promise<unknown> {
  return unwrap(apiPost<Result<unknown>>(`/api/trade-offers/${guid}/${accepts ? "accept" : "decline"}`));
}
