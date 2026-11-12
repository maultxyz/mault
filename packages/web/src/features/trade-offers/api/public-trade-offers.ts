import { shareLinkGuestKey } from "@/features/trade-offers/lib/guest-identity";
import { publicGet } from "@/lib/api/client";
import { API_BASE } from "@/lib/constants/api";
import {
  PUBLIC_GAMES_QUERY_KEY,
  PUBLIC_TRADE_OFFERS_QUERY_KEY,
  TRADE_OFFER_SEARCH_MIN_LENGTH,
} from "@/lib/constants/trade-offers";
import type { TradeOfferLink } from "@/lib/interfaces/trade-offers";
import {
  SHARE_LINK_GUEST_KEY_HEADER,
  type PublicGame,
  type PublicTradeOffer,
  type Result,
  type TradeOfferCardOptionPage,
  type TradeOfferRequest,
} from "@magic-vault/shared";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

function tradeOffersUrl(link: TradeOfferLink, path: string, params: Record<string, string> = {}) {
  const query = new URLSearchParams({ token: link.token, ...params });
  return `${API_BASE}/api/public/${link.basePath}/trade-offers${path}?${query}`;
}

async function readResult<T>(response: Response): Promise<T> {
  const result: Result<T> = await response.json();
  if (!result.success || result.data === undefined) throw new Error(result.message);
  return result.data;
}

export const publicTradeOffersKeys = {
  root: (link: TradeOfferLink) => [PUBLIC_TRADE_OFFERS_QUERY_KEY, link.basePath, link.token] as const,
  mine: (link: TradeOfferLink) => [...publicTradeOffersKeys.root(link), "mine"] as const,
  search: (link: TradeOfferLink, gameKey: string, query: string) =>
    [...publicTradeOffersKeys.root(link), "search", gameKey, query] as const,
};

export const guestTradeOffersQueryOptions = (link: TradeOfferLink) =>
  queryOptions({
    queryKey: publicTradeOffersKeys.mine(link),
    queryFn: async () =>
      readResult<PublicTradeOffer[]>(
        await fetch(tradeOffersUrl(link, ""), {
          headers: { [SHARE_LINK_GUEST_KEY_HEADER]: shareLinkGuestKey() },
        }),
      ),
  });

export const tradeOfferCardSearchQueryOptions = (
  link: TradeOfferLink,
  gameKey: string,
  query: string,
) =>
  queryOptions({
    queryKey: publicTradeOffersKeys.search(link, gameKey, query),
    queryFn: async () =>
      readResult<TradeOfferCardOptionPage>(
        await fetch(tradeOffersUrl(link, "/card-search", { game: gameKey, q: query })),
      ),
    enabled: !!gameKey && query.length >= TRADE_OFFER_SEARCH_MIN_LENGTH,
    placeholderData: keepPreviousData,
  });

export async function submitTradeOffer(
  link: TradeOfferLink,
  request: TradeOfferRequest,
): Promise<{ guid: string }> {
  return readResult<{ guid: string }>(
    await fetch(tradeOffersUrl(link, ""), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [SHARE_LINK_GUEST_KEY_HEADER]: shareLinkGuestKey(),
      },
      body: JSON.stringify(request),
    }),
  );
}

export const publicGamesQueryOptions = queryOptions({
  queryKey: [PUBLIC_GAMES_QUERY_KEY],
  queryFn: () =>
    publicGet<Result<PublicGame[]>>("/api/public/games").then((result) => result.data ?? []),
  staleTime: Infinity,
});
