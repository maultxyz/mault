import { queryOptions } from "@tanstack/react-query";
import type { Result } from "@magic-vault/shared";
import { apiGet, apiRequest, unwrap, unwrapOr } from "@/lib/api/client";
import {
  ADMIN_CARDS_QUERY_KEY,
  ADMIN_CATALOG_CARDS_PAGE_SIZE,
  ADMIN_FAILURE_STATUSES_WITH_MESSAGE,
} from "@/lib/constants/admin-cards";
import type { AdminCardGameCount, AdminCatalogCardsPage, AdminMessageResult } from "@/lib/interfaces/admin-cards";

export const catalogCardsQueryOptions = (page: number, search: string) =>
  queryOptions({
    queryKey: [...ADMIN_CARDS_QUERY_KEY, "catalog", page, search] as const,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(ADMIN_CATALOG_CARDS_PAGE_SIZE) });
      if (search) params.set("search", search);
      return unwrap(apiGet<Result<AdminCatalogCardsPage>>(`/api/admin/cards?${params.toString()}`));
    },
  });

export const cardGameCountsQueryOptions = queryOptions({
  queryKey: [...ADMIN_CARDS_QUERY_KEY, "game-counts"] as const,
  queryFn: () => unwrapOr(apiGet<Result<AdminCardGameCount[]>>("/api/admin/cards/games"), []),
});

async function postForMessage(path: string, body?: unknown): Promise<string> {
  const result = await apiRequest<AdminMessageResult>(path, {
    method: "POST",
    body: body ?? {},
    acceptStatuses: ADMIN_FAILURE_STATUSES_WITH_MESSAGE,
  });
  if (!result.success) throw new Error(result.message);
  return result.message;
}

export function revectorizeCatalogCard(cardId: string): Promise<string> {
  return postForMessage(`/api/admin/cards/${encodeURIComponent(cardId)}/revectorize`);
}

export function dumpCatalogCards(gameKey: string | null): Promise<string> {
  return postForMessage("/api/admin/cards/dump", gameKey ? { gameKey } : undefined);
}
