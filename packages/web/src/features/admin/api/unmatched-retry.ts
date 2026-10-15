import { apiGet, apiPost } from "@/lib/api/client";
import type {
  AdminUnmatchedOcrResult,
  AdminUnmatchedRetryRequest,
  AdminUnmatchedRetryResult,
  AdminUnmatchedScan,
  Result,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export const adminUnmatchedQueryOptions = queryOptions({
  queryKey: ["admin", "unmatched"] as const,
  queryFn: () =>
    apiGet<Result<AdminUnmatchedScan[]>>("/api/admin/unmatched").then(
      (r) => r.data ?? [],
    ),
});

export function retryAdminUnmatched(
  request: AdminUnmatchedRetryRequest,
): Promise<Result<AdminUnmatchedRetryResult[]>> {
  return apiPost("/api/admin/unmatched/retry", request);
}

export function runAdminUnmatchedOcr(
  scanId: string,
): Promise<Result<AdminUnmatchedOcrResult>> {
  return apiPost(`/api/admin/unmatched/${scanId}/ocr`);
}
