import { apiGet } from "@/lib/api/client";
import type {
  HealthCheck,
  HealthCheckResponse,
  Result,
} from "@magic-vault/shared";
import { queryOptions, useQuery } from "@tanstack/react-query";

export async function getHealth(): Promise<Result<HealthCheckResponse>> {
  return apiGet<Result<HealthCheckResponse>>("/api/public/health");
}

export const healthQueryOptions = queryOptions({
  queryKey: ["health"] as const,
  queryFn: () => getHealth().then((r) => r.data ?? null),
  refetchInterval: 60_000,
});

export function useGameApiHealthCheck(
  gameKey: string | null | undefined,
): HealthCheck | null {
  const { data } = useQuery(healthQueryOptions);
  if (!gameKey) return null;
  return data?.checks.find((check) => check.gameKey === gameKey) ?? null;
}
