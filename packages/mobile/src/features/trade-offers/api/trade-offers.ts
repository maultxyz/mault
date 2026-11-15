import type { Result, TradeOffer, TradeOfferPickResult } from "@magic-vault/shared";
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

export const tradeOffersQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: [TRADE_OFFERS_QUERY_KEY, orgId, "all"] as const,
    queryFn: () => unwrap(apiGet<Result<TradeOffer[]>>("/api/trade-offers")),
    enabled: !!orgId,
    staleTime: QUERY_STALE_MS,
  });

export function acceptTradeOfferWithPickList(guid: string): Promise<unknown> {
  return unwrap(
    apiPost<Result<unknown>>(`/api/trade-offers/${guid}/accept`, { removeWantedCardsWhenPicked: true }),
  );
}

export function declineTradeOffer(guid: string): Promise<unknown> {
  return unwrap(apiPost<Result<unknown>>(`/api/trade-offers/${guid}/decline`));
}

export function markTradeOfferCardsPicked(guid: string, scanIds: string[]): Promise<TradeOfferPickResult> {
  return unwrap(apiPost<Result<TradeOfferPickResult>>(`/api/trade-offers/${guid}/picked`, { scanIds }));
}

export function finishTradeOfferPicking(guid: string): Promise<TradeOfferPickResult> {
  return unwrap(apiPost<Result<TradeOfferPickResult>>(`/api/trade-offers/${guid}/finish-picking`));
}
