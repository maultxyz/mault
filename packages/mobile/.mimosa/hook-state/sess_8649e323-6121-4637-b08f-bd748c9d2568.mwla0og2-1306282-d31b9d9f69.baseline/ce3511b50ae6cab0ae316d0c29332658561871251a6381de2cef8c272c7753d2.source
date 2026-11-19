import { queryOptions } from "@tanstack/react-query";
import type { Result, SyncState } from "@magic-vault/shared";
import { apiGet, apiRequest, unwrap, unwrapOr } from "@/lib/api/client";
import {
  ADMIN_CARDS_QUERY_KEY,
  ADMIN_FAILURE_STATUSES_WITH_MESSAGE,
  ADMIN_SYNC_STATUS_RUNNING_REFRESH_MS,
} from "@/lib/constants/admin-cards";
import type { AdminMessageResult, AdminSyncSource, StartCardSyncInput, SyncCardByIdInput } from "@/lib/interfaces/admin-cards";

export const syncSourcesQueryOptions = queryOptions({
  queryKey: [...ADMIN_CARDS_QUERY_KEY, "sync-sources"] as const,
  queryFn: () => unwrapOr(apiGet<Result<AdminSyncSource[]>>("/api/admin/sync/sources"), []),
  staleTime: Infinity,
});

export const syncStatusQueryOptions = queryOptions({
  queryKey: [...ADMIN_CARDS_QUERY_KEY, "sync-status"] as const,
  queryFn: () => unwrap(apiGet<Result<SyncState>>("/api/admin/sync")),
  refetchInterval: (query) => (query.state.data?.status === "running" ? ADMIN_SYNC_STATUS_RUNNING_REFRESH_MS : false),
});

export function startCardSync({ gameKey, lang, forceResync, concurrency }: StartCardSyncInput): Promise<SyncState> {
  return unwrap(
    apiRequest<Result<SyncState>>("/api/admin/sync", {
      method: "POST",
      body: { gameKey, lang, forceResync, concurrency, vectorizeOn: "server" },
      acceptStatuses: ADMIN_FAILURE_STATUSES_WITH_MESSAGE,
    }),
  );
}

export function cancelCardSync(): Promise<SyncState> {
  return unwrap(
    apiRequest<Result<SyncState>>("/api/admin/sync", { method: "DELETE", acceptStatuses: ADMIN_FAILURE_STATUSES_WITH_MESSAGE }),
  );
}

export async function syncCardById(input: SyncCardByIdInput): Promise<string> {
  const result = await apiRequest<AdminMessageResult>("/api/admin/cards/sync", {
    method: "POST",
    body: input,
    acceptStatuses: ADMIN_FAILURE_STATUSES_WITH_MESSAGE,
  });
  if (!result.success) throw new Error(result.message);
  return result.message;
}
