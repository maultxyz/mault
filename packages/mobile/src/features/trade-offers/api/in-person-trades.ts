import {
  OWNED_CARD_SEARCH_COLLECTION_PARAM,
  OWNED_CARD_SEARCH_LIMIT_PARAM,
  OWNED_CARD_SEARCH_OFFSET_PARAM,
  type CardSearchPage,
  type CreatedInPersonTrade,
  type InPersonTradeQuoteRequest,
  type InPersonTradeRequest,
  type OwnedCardSearchResult,
  type Result,
  type TradeOfferQuote,
} from "@magic-vault/shared";
import { infiniteQueryOptions, keepPreviousData, queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, unwrap } from "@/lib/api/client";
import {
  IN_PERSON_TRADE_COLLECTION_CARDS_PAGE_SIZE,
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

export const inPersonCollectionCardsQueryOptions = (orgId: string | null, collectionGuid: string | null, query: string) =>
  infiniteQueryOptions({
    queryKey: [IN_PERSON_TRADE_SEARCH_QUERY_KEY, "collection", orgId, collectionGuid, query] as const,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({
        q: query,
        [OWNED_CARD_SEARCH_COLLECTION_PARAM]: collectionGuid ?? "",
        [OWNED_CARD_SEARCH_LIMIT_PARAM]: String(IN_PERSON_TRADE_COLLECTION_CARDS_PAGE_SIZE),
        [OWNED_CARD_SEARCH_OFFSET_PARAM]: String(pageParam),
      });
      return unwrap(apiGet<Result<OwnedCardSearchResult[]>>(`/api/collections/cards/search?${params.toString()}`));
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, lastOffset) =>
      lastPage.length === IN_PERSON_TRADE_COLLECTION_CARDS_PAGE_SIZE
        ? lastOffset + IN_PERSON_TRADE_COLLECTION_CARDS_PAGE_SIZE
        : undefined,
    enabled: !!orgId && !!collectionGuid,
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
