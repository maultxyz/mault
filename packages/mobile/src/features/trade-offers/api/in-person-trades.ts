import {
  OWNED_CARD_SEARCH_LIMIT_PARAM,
  type CardSearchPage,
  type CreatedInPersonTrade,
  type InPersonTradeQuoteRequest,
  type InPersonTradeRequest,
  type OwnedCardSearchResult,
  type Result,
  type TradeOfferQuote,
} from "@magic-vault/shared";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, unwrap } from "@/lib/api/client";
import {
  IN_PERSON_TRADE_QUOTE_QUERY_KEY,
  IN_PERSON_TRADE_SEARCH_MIN_LENGTH,
  IN_PERSON_TRADE_SEARCH_QUERY_KEY,
  IN_PERSON_TRADE_SEARCH_RESULTS_MAX,
} from "@/lib/constants/trade-offers";

export const inPersonTradeQuoteQueryOptions = (orgId: string | null, request: InPersonTradeQuoteRequest) =>
  queryOptions({
    queryKey: [IN_PERSON_TRADE_QUOTE_QUERY_KEY, orgId, request] as const,
    queryFn: () => unwrap(apiPost<Result<TradeOfferQuote>>("/api/trade-offers/in-person/quote", request)),
    enabled: !!orgId && (request.givenScanIds.length > 0 || request.received.length > 0),
    placeholderData: keepPreviousData,
  });

export const inPersonOwnedCardSearchQueryOptions = (orgId: string | null, query: string) =>
  queryOptions({
    queryKey: [IN_PERSON_TRADE_SEARCH_QUERY_KEY, "owned", orgId, query] as const,
    queryFn: () => {
      const params = new URLSearchParams({
        q: query,
        [OWNED_CARD_SEARCH_LIMIT_PARAM]: String(IN_PERSON_TRADE_SEARCH_RESULTS_MAX),
      });
      return unwrap(apiGet<Result<OwnedCardSearchResult[]>>(`/api/collections/cards/search?${params.toString()}`));
    },
    enabled: !!orgId && query.length >= IN_PERSON_TRADE_SEARCH_MIN_LENGTH,
    placeholderData: keepPreviousData,
  });

export const inPersonCatalogSearchQueryOptions = (collectionGuid: string | null, query: string) =>
  queryOptions({
    queryKey: [IN_PERSON_TRADE_SEARCH_QUERY_KEY, "catalog", collectionGuid, query] as const,
    queryFn: () => {
      const params = new URLSearchParams({ q: query, collectionGuid: collectionGuid ?? "" });
      return unwrap(apiGet<Result<CardSearchPage>>(`/api/cards/search?${params.toString()}`));
    },
    enabled: !!collectionGuid && query.length >= IN_PERSON_TRADE_SEARCH_MIN_LENGTH,
    placeholderData: keepPreviousData,
  });

export function recordInPersonTrade(request: InPersonTradeRequest): Promise<CreatedInPersonTrade> {
  return unwrap(apiPost<Result<CreatedInPersonTrade>>("/api/trade-offers/in-person", request));
}
