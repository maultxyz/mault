import { infiniteQueryOptions, type QueryClient } from "@tanstack/react-query";
import type { IdentifyUnmatchedCardRequest, Result, ScannedCard, UnmatchedCardsPage } from "@magic-vault/shared";
import { apiDelete, apiGet, apiRequest, unwrap, unwrapOr } from "@/lib/api/client";
import { UNMATCHED_LIST_PAGE_SIZE } from "@/lib/constants/collections";
import { invalidateCollectionCards } from "@/features/collections/api/collection-cards";

export const unmatchedCardsQueryOptions = (guid: string) =>
  infiniteQueryOptions({
    queryKey: ["collection-unmatched", guid] as const,
    queryFn: ({ pageParam }) =>
      unwrap(
        apiGet<Result<UnmatchedCardsPage>>(
          `/api/collections/${guid}/unmatched?limit=${UNMATCHED_LIST_PAGE_SIZE}&offset=${pageParam}`,
        ),
      ),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.cards.length, 0);
      return last.cards.length > 0 && loaded < last.total ? loaded : undefined;
    },
  });

export function identifyUnmatchedCard(
  guid: string,
  scanId: string,
  request: IdentifyUnmatchedCardRequest,
): Promise<ScannedCard> {
  return unwrap(
    apiRequest<Result<ScannedCard>>(`/api/collections/${guid}/unmatched/${scanId}/identify`, {
      method: "POST",
      body: request,
      acceptStatuses: [402],
    }),
  );
}

export function removeUnmatchedCard(guid: string, scanId: string): Promise<null> {
  return unwrapOr(apiDelete<Result<null>>(`/api/collections/${guid}/unmatched/${scanId}`), null);
}

export function clearUnmatchedCards(guid: string): Promise<null> {
  return unwrapOr(apiDelete<Result<null>>(`/api/collections/${guid}/unmatched`), null);
}

export function invalidateUnmatchedCards(queryClient: QueryClient, guid: string): void {
  void queryClient.invalidateQueries({ queryKey: ["collection-unmatched", guid] });
  invalidateCollectionCards(queryClient, guid);
}
