import { publicGet } from "@/lib/api/client";
import { useSyncState } from "@/lib/app-stream";
import type {
  HealthCheck,
  HealthCheckResponse,
  Result,
} from "@magic-vault/shared";
import { queryOptions, useQuery } from "@tanstack/react-query";

export async function getHealth(): Promise<Result<HealthCheckResponse>> {
  return publicGet<Result<HealthCheckResponse>>("/api/public/health");
}

export const healthQueryOptions = queryOptions({
  queryKey: ["health"] as const,
  queryFn: () => getHealth().then((r) => r.data ?? null),
  refetchInterval: 60_000,
});

export function useHealthQuery() {
  const syncState = useSyncState();
  return useQuery({
    ...healthQueryOptions,
    enabled: syncState.status !== "running",
  });
}

export function useGameApiHealthCheck(
  gameKey: string | null | undefined,
): HealthCheck | null {
  const { data } = useHealthQuery();
  if (!gameKey) return null;
  return data?.checks.find((check) => check.gameKey === gameKey) ?? null;
}
