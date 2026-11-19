import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import type {
  CreatedStatsSyncKey,
  Result,
  StatsSyncConnectInput,
  StatsSyncConnectionStatus,
  StatsSyncKeyStatus,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const statsSyncKeys = {
  key: (orgId: string | undefined) => ["stats-sync-key", orgId] as const,
  connection: (orgId: string | undefined) =>
    ["stats-sync-connection", orgId] as const,
};

export const statsSyncKeyQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: statsSyncKeys.key(orgId),
    queryFn: () =>
      apiGet<Result<StatsSyncKeyStatus>>("/api/stats-sync/key").then(
        (r) => r.data ?? null,
      ),
    enabled: !!orgId,
  });

export function generateStatsSyncKey(): Promise<Result<CreatedStatsSyncKey>> {
  return apiPost<Result<CreatedStatsSyncKey>>("/api/stats-sync/key", {});
}

export function revokeStatsSyncKey(): Promise<Result<StatsSyncKeyStatus>> {
  return apiDelete<Result<StatsSyncKeyStatus>>("/api/stats-sync/key");
}

export const statsSyncConnectionQueryOptions = (orgId: string | undefined) =>
  queryOptions({
    queryKey: statsSyncKeys.connection(orgId),
    queryFn: () =>
      apiGet<Result<StatsSyncConnectionStatus>>(
        "/api/stats-sync/connection",
      ).then((r) => r.data ?? null),
    enabled: !!orgId,
  });

export function connectStatsSync(
  input: StatsSyncConnectInput,
): Promise<Result<StatsSyncConnectionStatus>> {
  return apiPut<Result<StatsSyncConnectionStatus>>(
    "/api/stats-sync/connection",
    input,
  );
}

export function runStatsSyncNow(): Promise<Result<StatsSyncConnectionStatus>> {
  return apiPost<Result<StatsSyncConnectionStatus>>(
    "/api/stats-sync/connection/sync",
    {},
  );
}

export function disconnectStatsSync(): Promise<
  Result<StatsSyncConnectionStatus>
> {
  return apiDelete<Result<StatsSyncConnectionStatus>>(
    "/api/stats-sync/connection",
  );
}
