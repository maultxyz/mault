import { hasPublicCardFilters } from "@/features/public-cards/lib/public-card-filters";
import { API_BASE } from "@/lib/constants/api";
import {
  PUBLIC_CARDS_QUERY_KEY,
  PUBLIC_CARDS_RATE_LIMITED_STATUS,
} from "@/lib/constants/public-cards";
import type {
  PublicCardsErrorKind,
  PublicCardsRequest,
  PublicCardsSource,
} from "@/lib/interfaces/public-cards";
import {
  SCAN_IMAGE_SIDE_QUERY_PARAM,
  type PublicCardBrowseInfo,
  type PublicCardDetail,
  type PublicCardFacets,
  type PublicCardPage,
  type Result,
  type ScanImageSide,
} from "@magic-vault/shared";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

export const publicCardsKeys = {
  root: (source: PublicCardsSource) =>
    [PUBLIC_CARDS_QUERY_KEY, source.basePath, source.linkParams] as const,
  info: (source: PublicCardsSource) => [...publicCardsKeys.root(source), "info"] as const,
  facets: (source: PublicCardsSource, gameKey: string | null) =>
    [...publicCardsKeys.root(source), "facets", gameKey] as const,
  cards: (source: PublicCardsSource, request: PublicCardsRequest) =>
    [...publicCardsKeys.root(source), "cards", request] as const,
  card: (source: PublicCardsSource, scanId: string) =>
    [...publicCardsKeys.root(source), "card", scanId] as const,
};

export class PublicCardsError extends Error {
  readonly kind: PublicCardsErrorKind;

  constructor(kind: PublicCardsErrorKind, message?: string) {
    super(message ?? kind);
    this.name = "PublicCardsError";
    this.kind = kind;
  }
}

export function isPublicCardsUnavailableError(error: unknown): boolean {
  return !(error instanceof PublicCardsError) || error.kind === "unavailable";
}

function isServerOrRateLimitStatus(status: number) {
  return status >= 500 || status === PUBLIC_CARDS_RATE_LIMITED_STATUS;
}

export async function fetchPublicCards<T>(
  basePath: string,
  path: string,
  params: URLSearchParams,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/public/${basePath}${path}?${params}`);
  } catch (error) {
    throw new PublicCardsError(
      "unavailable",
      error instanceof Error ? error.message : undefined,
    );
  }
  if (isServerOrRateLimitStatus(response.status)) {
    throw new PublicCardsError("unavailable", response.statusText);
  }
  let result: Result<T>;
  try {
    result = await response.json();
  } catch {
    throw new PublicCardsError("unavailable", response.statusText);
  }
  if (!response.ok || !result.success || !result.data) {
    throw new PublicCardsError("notFound", result.message);
  }
  return result.data;
}

export async function loadPublicScanImageDownload(
  source: PublicCardsSource,
  scanId: string,
  side: ScanImageSide,
): Promise<Blob> {
  const params = new URLSearchParams(source.linkParams);
  params.set(SCAN_IMAGE_SIDE_QUERY_PARAM, side);
  const response = await fetch(
    `${API_BASE}/api/public/${source.basePath}/cards/${encodeURIComponent(scanId)}/scan-image/download?${params}`,
  );
  if (!response.ok) throw new PublicCardsError("unavailable", response.statusText);
  return response.blob();
}

export const publicCardsInfoQueryOptions = (source: PublicCardsSource) =>
  queryOptions({
    queryKey: publicCardsKeys.info(source),
    queryFn: () =>
      fetchPublicCards<PublicCardBrowseInfo>(
        source.basePath,
        "",
        new URLSearchParams(source.linkParams),
      ),
    retry: false,
  });

export const publicCardsFacetsQueryOptions = (
  source: PublicCardsSource,
  gameKey: string | null,
) =>
  queryOptions({
    queryKey: publicCardsKeys.facets(source, gameKey),
    queryFn: () =>
      fetchPublicCards<PublicCardFacets>(
        source.basePath,
        "/facets",
        new URLSearchParams({ ...source.linkParams, ...(gameKey ? { game: gameKey } : {}) }),
      ),
    placeholderData: keepPreviousData,
  });

export const publicCardsPageQueryOptions = (
  source: PublicCardsSource,
  request: PublicCardsRequest,
) =>
  queryOptions({
    queryKey: publicCardsKeys.cards(source, request),
    queryFn: () =>
      fetchPublicCards<PublicCardPage>(
        source.basePath,
        "/cards",
        new URLSearchParams({
          ...source.linkParams,
          page: String(request.page),
          limit: String(request.pageSize),
          sort: request.sort,
          ...(request.search ? { search: request.search } : {}),
          ...(request.gameKey ? { game: request.gameKey } : {}),
          ...(hasPublicCardFilters(request.filters)
            ? { filters: JSON.stringify(request.filters) }
            : {}),
        }),
      ),
    placeholderData: keepPreviousData,
  });

export const publicCardDetailQueryOptions = (source: PublicCardsSource, scanId: string) =>
  queryOptions({
    queryKey: publicCardsKeys.card(source, scanId),
    queryFn: () =>
      fetchPublicCards<PublicCardDetail>(
        source.basePath,
        `/cards/${encodeURIComponent(scanId)}`,
        new URLSearchParams(source.linkParams),
      ),
    retry: false,
  });
