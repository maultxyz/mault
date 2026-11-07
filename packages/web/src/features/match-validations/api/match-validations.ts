import { apiGet, apiPost } from "@/lib/api/client";
import type {
  MatchValidationProgress,
  MatchValidationQueue,
  MatchValidationRequest,
  MatchValidationScan,
  PagedList,
  Result,
} from "@magic-vault/shared";
import { MATCH_VALIDATION_PROGRESS_MAX_AGE_MS } from "@magic-vault/shared";
import { MATCH_VALIDATION_SCANS_PAGE_SIZE } from "@/lib/constants/match-validations";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

export const matchValidationQueueQueryOptions = queryOptions({
  queryKey: ["match-validations", "queue"] as const,
  queryFn: () =>
    apiGet<Result<MatchValidationQueue>>("/api/match-validations/queue").then(
      (r) => r.data ?? null,
    ),
  refetchOnWindowFocus: false,
});

export const matchValidationProgressQueryOptions = queryOptions({
  queryKey: ["match-validations", "progress"] as const,
  queryFn: () =>
    apiGet<Result<MatchValidationProgress>>(
      "/api/match-validations/progress",
    ).then((r) => r.data ?? null),
  staleTime: MATCH_VALIDATION_PROGRESS_MAX_AGE_MS,
  refetchOnWindowFocus: false,
});

export const MATCH_VALIDATION_SCANS_QUERY_KEY = ["match-validations", "scans"] as const;

export const matchValidationScansQueryOptions = (page: number) =>
  queryOptions({
    queryKey: [...MATCH_VALIDATION_SCANS_QUERY_KEY, page] as const,
    queryFn: () =>
      apiGet<Result<PagedList<MatchValidationScan>>>(
        `/api/match-validations/scans?page=${page}&limit=${MATCH_VALIDATION_SCANS_PAGE_SIZE}`,
      ).then((r) => r.data ?? null),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

export function saveMatchValidation(
  request: MatchValidationRequest,
): Promise<Result<null>> {
  return apiPost("/api/match-validations", request);
}
