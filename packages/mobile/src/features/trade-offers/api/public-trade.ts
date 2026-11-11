import {
  SHARE_LINK_GUEST_KEY_HEADER,
  type MonitorLinkInfo,
  type PublicCardPage,
  type Result,
  type StorageShareLinkInfo,
  type TradeOfferRequest,
} from "@magic-vault/shared";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { tradeGuestKey } from "@/features/trade-offers/lib/guest-key";
import { API_BASE } from "@/lib/constants/config";
import {
  TRADE_LINK_BASE_PATHS,
  TRADE_LINK_CARDS_PAGE_SIZE,
  TRADE_LINK_CARDS_QUERY_KEY,
  TRADE_LINK_INFO_QUERY_KEY,
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
        return { name: info.collectionName, purpose: info.purpose };
      }
      const info = await readResult<StorageShareLinkInfo>(await fetch(publicUrl(link, "")));
      return { name: info.locationName, purpose: info.purpose };
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

export async function submitTradeOffer(link: TradeLinkRef, request: TradeOfferRequest): Promise<void> {
  await readResult<{ guid: string }>(
    await fetch(publicUrl(link, "/trade-offers"), {
      method: "POST",
      headers: { "Content-Type": "application/json", [SHARE_LINK_GUEST_KEY_HEADER]: tradeGuestKey() },
      body: JSON.stringify(request),
    }),
  );
}
