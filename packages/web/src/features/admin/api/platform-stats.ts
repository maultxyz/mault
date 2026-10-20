import { apiGet, apiPost, apiPut } from "@/lib/api/client";
import type {
  AdminPlatformStatsResponse,
  PlatformStatsSettings,
  Result,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const platformStatsQueryOptions = queryOptions({
  queryKey: ["admin", "platform-stats"] as const,
  queryFn: () =>
    apiGet<Result<AdminPlatformStatsResponse>>("/api/admin/platform-stats").then(
      (r) => r.data ?? null,
    ),
});

export function savePlatformStatsSettings(
  settings: PlatformStatsSettings,
): Promise<Result<AdminPlatformStatsResponse>> {
  return apiPut("/api/admin/platform-stats", settings);
}

export function postPlatformStatsNow(): Promise<
  Result<AdminPlatformStatsResponse>
> {
  return apiPost("/api/admin/platform-stats/post");
}
