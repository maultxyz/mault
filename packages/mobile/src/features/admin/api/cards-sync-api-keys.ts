import { queryOptions } from "@tanstack/react-query";
import type { CreatedSyncApiKey, Result, SyncApiKey, SyncApiKeyInput } from "@magic-vault/shared";
import { apiDelete, apiGet, apiPost, unwrap, unwrapOr } from "@/lib/api/client";
import { ADMIN_CARDS_QUERY_KEY } from "@/lib/constants/admin-cards";

export const syncApiKeysQueryOptions = queryOptions({
  queryKey: [...ADMIN_CARDS_QUERY_KEY, "sync-api-keys"] as const,
  queryFn: () => unwrapOr(apiGet<Result<SyncApiKey[]>>("/api/admin/sync-api-keys"), []),
});

export function createSyncApiKey(input: SyncApiKeyInput): Promise<CreatedSyncApiKey> {
  return unwrap(apiPost<Result<CreatedSyncApiKey>>("/api/admin/sync-api-keys", input));
}

export async function revokeSyncApiKey(guid: string): Promise<void> {
  const result = await apiDelete<Result<null>>(`/api/admin/sync-api-keys/${guid}`);
  if (!result.success) throw new Error(result.message ?? "Request failed.");
}
