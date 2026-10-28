import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import type {
  CreatedSyncApiKey,
  Result,
  SyncApiKey,
  SyncApiKeyInput,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const syncApiKeysQueryOptions = queryOptions({
  queryKey: ["admin", "sync-api-keys"] as const,
  queryFn: () =>
    apiGet<Result<SyncApiKey[]>>("/api/admin/sync-api-keys").then(
      (r) => r.data ?? [],
    ),
});

export function createSyncApiKey(
  input: SyncApiKeyInput,
): Promise<Result<CreatedSyncApiKey>> {
  return apiPost<Result<CreatedSyncApiKey>>("/api/admin/sync-api-keys", input);
}

export function revokeSyncApiKey(guid: string): Promise<Result<null>> {
  return apiDelete<Result<null>>(`/api/admin/sync-api-keys/${guid}`);
}
