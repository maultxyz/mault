import { collectionCardsKeys } from "@/features/collections/api/collection-cards";
import { apiGet, apiPost } from "@/lib/api/client";
import {
  IN_PERSON_TRADE_CATALOG_SEARCH_QUERY_KEY,
  IN_PERSON_TRADE_OWNED_SEARCH_QUERY_KEY,
  IN_PERSON_TRADE_QUOTE_QUERY_KEY,
  IN_PERSON_TRADE_SEARCH_RESULTS_MAX,
  TRADE_OFFER_SEARCH_MIN_LENGTH,
  TRADE_OFFERS_QUERY_KEY,
} from "@/lib/constants/trade-offers";
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
import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

async function unwrapResult<T>(request: Promise<Result<T>>): Promise<T> {
  const result = await request;
  if (!result.success || result.data === undefined) throw new Error(result.message);
  return result.data;
}

export const inPersonTradeQuoteQueryOptions = (orgId: string | undefined, request: InPersonTradeQuoteRequest) =>
  queryOptions({
    queryKey: [IN_PERSON_TRADE_QUOTE_QUERY_KEY, orgId, request] as const,
    queryFn: () =>
      unwrapResult(apiPost<Result<TradeOfferQuote>>("/api/trade-offers/in-person/quote", request)),
    enabled: !!orgId && (request.givenScanIds.length > 0 || request.received.length > 0),
    placeholderData: keepPreviousData,
  });

export const inPersonOwnedCardSearchQueryOptions = (orgId: string | undefined, query: string) =>
  queryOptions({
    queryKey: [IN_PERSON_TRADE_OWNED_SEARCH_QUERY_KEY, orgId, query] as const,
    queryFn: () => {
      const params = new URLSearchParams({
        q: query,
        [OWNED_CARD_SEARCH_LIMIT_PARAM]: String(IN_PERSON_TRADE_SEARCH_RESULTS_MAX),
      });
      return unwrapResult(apiGet<Result<OwnedCardSearchResult[]>>(`/api/collections/cards/search?${params}`));
    },
    enabled: !!orgId && query.length >= TRADE_OFFER_SEARCH_MIN_LENGTH,
    placeholderData: keepPreviousData,
  });

export const inPersonCatalogSearchQueryOptions = (collectionGuid: string, query: string) =>
  queryOptions({
    queryKey: [IN_PERSON_TRADE_CATALOG_SEARCH_QUERY_KEY, collectionGuid, query] as const,
    queryFn: () => {
      const params = new URLSearchParams({ q: query, collectionGuid });
      return unwrapResult(apiGet<Result<CardSearchPage>>(`/api/cards/search?${params}`));
    },
    enabled: !!collectionGuid && query.length >= TRADE_OFFER_SEARCH_MIN_LENGTH,
    placeholderData: keepPreviousData,
  });

export function useRecordInPersonTrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: InPersonTradeRequest) =>
      unwrapResult(apiPost<Result<CreatedInPersonTrade>>("/api/trade-offers/in-person", request)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collectionCardsKeys.root() });
      return queryClient.invalidateQueries({ queryKey: [TRADE_OFFERS_QUERY_KEY] });
    },
  });
}
