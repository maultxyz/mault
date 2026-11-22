import { queryOptions } from "@tanstack/react-query";
import type {
  CreatedStatsSyncKey,
  Result,
  StatsSyncConnectInput,
  StatsSyncConnectionStatus,
  StatsSyncKeyStatus,
} from "@magic-vault/shared";
import { apiDelete, apiGet, apiPost, apiPut, unwrap } from "@/lib/api/client";

export const statsSyncKeyQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: ["stats-sync-key", orgId] as const,
    queryFn: () => unwrap(apiGet<Result<StatsSyncKeyStatus>>("/api/stats-sync/key")),
    enabled: !!orgId,
  });

export function generateStatsSyncKey(): Promise<CreatedStatsSyncKey> {
  return unwrap(apiPost<Result<CreatedStatsSyncKey>>("/api/stats-sync/key", {}));
}

export function revokeStatsSyncKey(): Promise<StatsSyncKeyStatus> {
  return unwrap(apiDelete<Result<StatsSyncKeyStatus>>("/api/stats-sync/key"));
}

export const statsSyncConnectionQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: ["stats-sync-connection", orgId] as const,
    queryFn: () => unwrap(apiGet<Result<StatsSyncConnectionStatus>>("/api/stats-sync/connection")),
    enabled: !!orgId,
  });

export function connectStatsSync(input: StatsSyncConnectInput): Promise<StatsSyncConnectionStatus> {
  return unwrap(apiPut<Result<StatsSyncConnectionStatus>>("/api/stats-sync/connection", input));
}

export function runStatsSyncNow(): Promise<StatsSyncConnectionStatus> {
  return unwrap(apiPost<Result<StatsSyncConnectionStatus>>("/api/stats-sync/connection/sync", {}));
}

export function disconnectStatsSync(): Promise<StatsSyncConnectionStatus> {
  return unwrap(apiDelete<Result<StatsSyncConnectionStatus>>("/api/stats-sync/connection"));
}
