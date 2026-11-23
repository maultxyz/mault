import { apiGet, apiPost } from "@/lib/api/client";
import { SERVER_CACHES_QUERY_KEY } from "@/lib/constants/admin";
import type {
  AdminCacheKeysPage,
  AdminCacheSummary,
  AdminClearCacheEntriesRequest,
  AdminClearCacheEntriesResult,
  Result,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

function cachePath(cacheName: string): string {
  return `/api/admin/caches/${encodeURIComponent(cacheName)}`;
}

export const serverCachesQueryOptions = queryOptions({
  queryKey: SERVER_CACHES_QUERY_KEY,
  queryFn: async () => {
    const result = await apiGet<Result<AdminCacheSummary[]>>("/api/admin/caches");
    if (!result.success || !result.data) throw new Error(result.message);
    return result.data;
  },
});

export function serverCacheKeysQueryOptions(cacheName: string, keyContains: string) {
  return queryOptions({
    queryKey: [...SERVER_CACHES_QUERY_KEY, "keys", cacheName, keyContains] as const,
    queryFn: async () => {
      const search = keyContains ? `?q=${encodeURIComponent(keyContains)}` : "";
      const result = await apiGet<Result<AdminCacheKeysPage>>(
        `${cachePath(cacheName)}/keys${search}`,
      );
      if (!result.success || !result.data) throw new Error(result.message);
      return result.data;
    },
  });
}

export async function clearServerCacheEntries(
  cacheName: string,
  request: AdminClearCacheEntriesRequest,
): Promise<AdminClearCacheEntriesResult> {
  const result = await apiPost<Result<AdminClearCacheEntriesResult>>(
    `${cachePath(cacheName)}/clear`,
    request,
  );
  if (!result.success || !result.data) throw new Error(result.message);
  return result.data;
}

export async function clearOrgServerCaches(orgId: string): Promise<AdminClearCacheEntriesResult> {
  const result = await apiPost<Result<AdminClearCacheEntriesResult>>(
    `/api/admin/caches/orgs/${encodeURIComponent(orgId)}/clear`,
  );
  if (!result.success || !result.data) throw new Error(result.message);
  return result.data;
}
