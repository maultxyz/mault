import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import {
  MATCH_VALIDATION_PROGRESS_MAX_AGE_MS,
  type MatchValidationProgress,
  type MatchValidationQueue,
  type MatchValidationRequest,
  type MatchValidationScan,
  type PagedList,
  type Result,
} from "@magic-vault/shared";
import { apiGet, apiPost, getAuthHeaders, unwrap } from "@/lib/api/client";
import { MATCH_VALIDATION_SCANS_PAGE_SIZE } from "@/lib/constants/match-validations";

function gameQuery(gameKey: string | null): string {
  return gameKey ? `game=${encodeURIComponent(gameKey)}` : "";
}

export const MATCH_VALIDATION_SCANS_QUERY_KEY = ["match-validations", "scans"] as const;

export const matchValidationQueueQueryOptions = (gameKey: string | null) =>
  queryOptions({
    queryKey: ["match-validations", "queue", gameKey] as const,
    queryFn: () => unwrap(apiGet<Result<MatchValidationQueue>>(`/api/match-validations/queue?${gameQuery(gameKey)}`)),
    staleTime: 0,
  });

export const matchValidationProgressQueryOptions = queryOptions({
  queryKey: ["match-validations", "progress"] as const,
  queryFn: () => unwrap(apiGet<Result<MatchValidationProgress>>("/api/match-validations/progress")),
  staleTime: MATCH_VALIDATION_PROGRESS_MAX_AGE_MS,
});

export const matchValidationScansQueryOptions = (gameKey: string | null) =>
  infiniteQueryOptions({
    queryKey: [...MATCH_VALIDATION_SCANS_QUERY_KEY, gameKey] as const,
    queryFn: ({ pageParam }) =>
      unwrap(
        apiGet<Result<PagedList<MatchValidationScan>>>(
          `/api/match-validations/scans?page=${pageParam}&limit=${MATCH_VALIDATION_SCANS_PAGE_SIZE}&${gameQuery(gameKey)}`,
        ),
      ),
    initialPageParam: 1,
    getNextPageParam: (last, pages) =>
      pages.reduce((sum, page) => sum + page.items.length, 0) < last.total ? pages.length + 1 : undefined,
  });

export const authHeadersQueryOptions = queryOptions({
  queryKey: ["auth-headers"] as const,
  queryFn: () => getAuthHeaders(),
  staleTime: 60_000,
});

export function saveMatchValidation(request: MatchValidationRequest): Promise<Result<null>> {
  return apiPost<Result<null>>("/api/match-validations", request);
}
