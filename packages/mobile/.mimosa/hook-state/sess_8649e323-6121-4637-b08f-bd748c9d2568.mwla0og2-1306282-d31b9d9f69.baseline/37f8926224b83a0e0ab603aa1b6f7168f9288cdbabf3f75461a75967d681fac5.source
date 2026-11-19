import { queryOptions } from "@tanstack/react-query";
import type { ActiveScanningStats, PublicMetrics, Result } from "@magic-vault/shared";
import { apiGet, unwrap } from "@/lib/api/client";
import {
  ADMIN_ACTIVE_SCANNING_REFRESH_MS,
  ADMIN_CARDS_QUERY_KEY,
  ADMIN_SCAN_METRICS_REFRESH_MS,
  ADMIN_SCAN_VECTORIZE_STATS_REFRESH_MS,
} from "@/lib/constants/admin-cards";
import type { AdminScanVectorizeStats } from "@/lib/interfaces/admin-cards";

export const activeScanningQueryOptions = queryOptions({
  queryKey: [...ADMIN_CARDS_QUERY_KEY, "active-scanning"] as const,
  queryFn: () => unwrap(apiGet<Result<ActiveScanningStats>>("/api/admin/active-scanning")),
  refetchInterval: ADMIN_ACTIVE_SCANNING_REFRESH_MS,
});

export const scanMetricsQueryOptions = queryOptions({
  queryKey: [...ADMIN_CARDS_QUERY_KEY, "scan-metrics"] as const,
  queryFn: () => unwrap(apiGet<Result<PublicMetrics>>("/api/admin/scan-metrics")),
  refetchInterval: ADMIN_SCAN_METRICS_REFRESH_MS,
});

export const scanVectorizeStatsQueryOptions = queryOptions({
  queryKey: [...ADMIN_CARDS_QUERY_KEY, "scan-vectorize-stats"] as const,
  queryFn: () => unwrap(apiGet<Result<AdminScanVectorizeStats>>("/api/admin/scan-vectorize-stats")),
  refetchInterval: ADMIN_SCAN_VECTORIZE_STATS_REFRESH_MS,
});
