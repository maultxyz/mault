import {
  PRICE_SOURCE_FIELDS,
  SHARE_LINK_GUEST_KEY_HEADER,
  type MonitorLinkInfo,
  type PublicCardPage,
  type Result,
  type StorageShareLinkInfo,
  type TradeOfferQuote,
  type TradeOfferQuoteRequest,
  type TradeOfferRequest,
} from "@magic-vault/shared";
import { infiniteQueryOptions, keepPreviousData, queryOptions } from "@tanstack/react-query";
import { tradeGuestKey } from "@/features/trade-offers/lib/guest-key";
import { getAccessToken } from "@/lib/auth/session";
import { API_BASE } from "@/lib/constants/config";
import {
  TRADE_LINK_BASE_PATHS,
  TRADE_LINK_CARDS_PAGE_SIZE,
  TRADE_LINK_CARDS_QUERY_KEY,
  TRADE_LINK_INFO_QUERY_KEY,
  TRADE_OFFER_QUOTE_QUERY_KEY,
} from "@/lib/constants/trade";
import type { TradeLinkInfo, TradeLinkRef } from "@/lib/interfaces/trade";

function publicUrl(link: TradeLinkRef, path: string, params: Record<string, string> = {}): string {
  const query = new URLSearchParams({ token: link.token, ...params }).toString();
  return `${API_BASE}/api/public/${TRADE_LINK_BASE_PATHS[link.kind]}${path}?${query}`;
}

async function readResult<T>(response: Response): Promise<T> {
  const result = (await response.json()) as Result<T>;
  if (!result.success || result.data === undefined) throw new Error(result.message ?? "Request failed.");
  return result.data;
}

export const tradeLinkInfoQueryOptions = (link: TradeLinkRef) =>
  queryOptions({
    queryKey: [TRADE_LINK_INFO_QUERY_KEY, link.kind, link.guid, link.token] as const,
    queryFn: async (): Promise<TradeLinkInfo> => {
      if (link.kind === "collection") {
        const info = await readResult<MonitorLinkInfo>(await fetch(publicUrl(link, "")));
        return {
          name: info.collectionName,
          purpose: info.purpose,
          cashCurrency: PRICE_SOURCE_FIELDS[info.priceSource].currency,
          priceSource: info.priceSource,
          showsPrices: info.showsPrices,
          requiresGuestContact: info.requiresGuestContact !== false,
        };
      }
      const info = await readResult<StorageShareLinkInfo>(await fetch(publicUrl(link, "")));
      return {
        name: info.locationName,
        purpose: info.purpose,
        cashCurrency: PRICE_SOURCE_FIELDS[info.priceSource].currency,
        priceSource: info.priceSource,
        showsPrices: info.showsPrices,
        requiresGuestContact: info.requiresGuestContact !== false,
      };
    },
    retry: false,
  });

export const tradeLinkCardsQueryOptions = (link: TradeLinkRef, search: string) =>
  infiniteQueryOptions({
    queryKey: [TRADE_LINK_CARDS_QUERY_KEY, link.kind, link.guid, link.token, search] as const,
    queryFn: async ({ pageParam }) =>
      readResult<PublicCardPage>(
        await fetch(
          publicUrl(link, "/browse/cards", {
            page: String(pageParam),
            limit: String(TRADE_LINK_CARDS_PAGE_SIZE),
            ...(search ? { search } : {}),
          }),
        ),
      ),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });

export const tradeOfferQuoteQueryOptions = (
  link: TradeLinkRef,
  request: TradeOfferQuoteRequest,
  showsPrices: boolean,
) =>
  queryOptions({
    queryKey: [TRADE_OFFER_QUOTE_QUERY_KEY, link.kind, link.guid, link.token, request] as const,
    queryFn: async () =>
      readResult<TradeOfferQuote>(
        await fetch(publicUrl(link, "/trade-offers/quote"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        }),
      ),
    enabled: showsPrices && (request.wantedScanIds.length > 0 || request.offered.length > 0),
    placeholderData: keepPreviousData,
  });

export async function submitTradeOffer(link: TradeLinkRef, request: TradeOfferRequest): Promise<void> {
  const accessToken = await getAccessToken().catch(() => null);
  await readResult<{ guid: string }>(
    await fetch(publicUrl(link, "/trade-offers"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [SHARE_LINK_GUEST_KEY_HEADER]: tradeGuestKey(),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(request),
    }),
  );
}
