import { hasPublicCardFilters } from "@/features/public-cards/lib/public-card-filters";
import { API_BASE } from "@/lib/constants/api";
import { PUBLIC_CARDS_QUERY_KEY } from "@/lib/constants/public-cards";
import type { PublicCardsRequest, PublicCardsSource } from "@/lib/interfaces/public-cards";
import type {
  PublicCardBrowseInfo,
  PublicCardDetail,
  PublicCardFacets,
  PublicCardPage,
  Result,
} from "@magic-vault/shared";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

export const publicCardsKeys = {
  root: (basePath: string, token: string) => [PUBLIC_CARDS_QUERY_KEY, basePath, token] as const,
  info: (basePath: string, token: string) =>
    [...publicCardsKeys.root(basePath, token), "info"] as const,
  facets: (source: PublicCardsSource, gameKey: string | null) =>
    [...publicCardsKeys.root(source.basePath, source.token), "facets", gameKey] as const,
  cards: (source: PublicCardsSource, request: PublicCardsRequest) =>
    [...publicCardsKeys.root(source.basePath, source.token), "cards", request] as const,
  card: (source: PublicCardsSource, scanId: string) =>
    [...publicCardsKeys.root(source.basePath, source.token), "card", scanId] as const,
};

export async function fetchPublicCards<T>(
  basePath: string,
  path: string,
  params: URLSearchParams,
): Promise<T> {
  const response = await fetch(`${API_BASE}/api/public/${basePath}${path}?${params}`);
  const result: Result<T> = await response.json();
  if (!result.success || !result.data) throw new Error(result.message);
  return result.data;
}

export const publicCardsInfoQueryOptions = (source: PublicCardsSource) =>
  queryOptions({
    queryKey: publicCardsKeys.info(source.basePath, source.token),
    queryFn: () =>
      fetchPublicCards<PublicCardBrowseInfo>(
        source.basePath,
        "",
        new URLSearchParams({ token: source.token }),
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
        new URLSearchParams({ token: source.token, ...(gameKey ? { game: gameKey } : {}) }),
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
          token: source.token,
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
        new URLSearchParams({ token: source.token }),
      ),
    retry: false,
  });
