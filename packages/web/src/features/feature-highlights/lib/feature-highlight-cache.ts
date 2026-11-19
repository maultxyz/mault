import { FEATURE_HIGHLIGHTS_QUERY_KEY } from "@/lib/constants/feature-highlights";
import type {
  FeatureHighlightsResponse,
  FeatureHighlightTimelinePage,
} from "@magic-vault/shared";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";

export function markFeatureHighlightsSeenInCaches(
  queryClient: QueryClient,
  highlightIds: string[],
): void {
  const markedIds = new Set(highlightIds);
  queryClient.setQueriesData<FeatureHighlightsResponse>(
    { queryKey: [FEATURE_HIGHLIGHTS_QUERY_KEY, "unseen"] },
    (data) =>
      data && {
        ...data,
        highlights: data.highlights.filter(
          (highlight) => !markedIds.has(highlight.id),
        ),
      },
  );
  queryClient.setQueriesData<InfiniteData<FeatureHighlightTimelinePage>>(
    { queryKey: [FEATURE_HIGHLIGHTS_QUERY_KEY, "timeline"] },
    (data) =>
      data && {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          seenHighlightIds: [
            ...new Set([...page.seenHighlightIds, ...highlightIds]),
          ],
        })),
      },
  );
}

export function seenFeatureHighlightIdsOf(
  pages: FeatureHighlightTimelinePage[],
): Set<string> {
  return new Set(pages.flatMap((page) => page.seenHighlightIds));
}
