import { apiGet, apiGetBlob, apiPost } from "@/lib/api/client";
import type {
  MatchValidationProgress,
  MatchValidationQueue,
  MatchValidationRequest,
  MatchValidationScan,
  PagedList,
  Result,
} from "@magic-vault/shared";
import { MATCH_VALIDATION_PROGRESS_MAX_AGE_MS } from "@magic-vault/shared";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

function gameQuery(gameKey: string | null): string {
  return gameKey ? `game=${encodeURIComponent(gameKey)}` : "";
}

export const matchValidationQueueQueryOptions = (gameKey: string | null) =>
  queryOptions({
    queryKey: ["match-validations", "queue", gameKey] as const,
    queryFn: () =>
      apiGet<Result<MatchValidationQueue>>(
        `/api/match-validations/queue?${gameQuery(gameKey)}`,
      ).then((r) => r.data ?? null),
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

export const matchValidationScansQueryOptions = (
  page: number,
  gameKey: string | null,
  pageSize: number,
) =>
  queryOptions({
    queryKey: [...MATCH_VALIDATION_SCANS_QUERY_KEY, gameKey, page, pageSize] as const,
    queryFn: () =>
      apiGet<Result<PagedList<MatchValidationScan>>>(
        `/api/match-validations/scans?page=${page}&limit=${pageSize}&${gameQuery(gameKey)}`,
      ).then((r) => r.data ?? null),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

export const matchValidationThumbnailQueryOptions = (scanId: string) =>
  queryOptions({
    queryKey: ["match-validations", "thumbnail", scanId] as const,
    queryFn: () =>
      apiGetBlob(`/api/match-validations/scans/${scanId}/thumbnail`),
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    retry: false,
  });

export function saveMatchValidation(
  request: MatchValidationRequest,
): Promise<Result<null>> {
  return apiPost("/api/match-validations", request);
}
