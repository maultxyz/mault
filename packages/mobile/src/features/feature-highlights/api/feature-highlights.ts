import { infiniteQueryOptions, queryOptions, useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import {
  FEATURE_HIGHLIGHTS_PATH,
  FEATURE_HIGHLIGHTS_SEEN_PATH,
  FEATURE_HIGHLIGHTS_TIMELINE_BEFORE_PARAM,
  FEATURE_HIGHLIGHTS_TIMELINE_PATH,
  type FeatureHighlightsResponse,
  type FeatureHighlightTimelinePage,
  type MarkFeatureHighlightsSeenRequest,
  type Response,
  type Result,
} from "@magic-vault/shared";
import { apiGet, apiPost, unwrap } from "@/lib/api/client";
import { ApiResultError } from "@/lib/api/api-result-error";
import { FEATURE_HIGHLIGHTS_QUERY_KEY } from "@/lib/constants/feature-highlights";
import type { MarkFeatureHighlightsSeenContext } from "@/lib/interfaces/feature-highlights";

export const unseenFeatureHighlightsQueryOptions = (userId: string | null, isEnabled: boolean) =>
  queryOptions({
    queryKey: [FEATURE_HIGHLIGHTS_QUERY_KEY, userId, "unseen"] as const,
    queryFn: () => unwrap(apiGet<Result<FeatureHighlightsResponse>>(`/api${FEATURE_HIGHLIGHTS_PATH}`)),
    enabled: !!userId && isEnabled,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

export const featureHighlightTimelineQueryOptions = (userId: string | null) =>
  infiniteQueryOptions({
    queryKey: [FEATURE_HIGHLIGHTS_QUERY_KEY, userId, "timeline"] as const,
    queryFn: ({ pageParam }) =>
      unwrap(
        apiGet<Result<FeatureHighlightTimelinePage>>(
          pageParam
            ? `/api${FEATURE_HIGHLIGHTS_TIMELINE_PATH}?${FEATURE_HIGHLIGHTS_TIMELINE_BEFORE_PARAM}=${encodeURIComponent(pageParam)}`
            : `/api${FEATURE_HIGHLIGHTS_TIMELINE_PATH}`,
        ),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextBefore ?? undefined,
    enabled: !!userId,
  });

function withSeenIds(seenHighlightIds: string[], highlightIds: string[]): string[] {
  return [...new Set([...seenHighlightIds, ...highlightIds])];
}

export function useMarkFeatureHighlightsSeen() {
  const queryClient = useQueryClient();
  return useMutation<Response, Error, MarkFeatureHighlightsSeenRequest, MarkFeatureHighlightsSeenContext>({
    mutationFn: async (request) => {
      const result = await apiPost<Response>(`/api${FEATURE_HIGHLIGHTS_SEEN_PATH}`, request);
      if (!result.success) throw new ApiResultError(result.message ?? "Request failed.");
      return result;
    },
    onMutate: async ({ highlightIds }) => {
      await queryClient.cancelQueries({ queryKey: [FEATURE_HIGHLIGHTS_QUERY_KEY] });
      const previousData = queryClient.getQueriesData<unknown>({ queryKey: [FEATURE_HIGHLIGHTS_QUERY_KEY] });
      const seenIds = new Set(highlightIds);
      for (const [queryKey, data] of previousData) {
        if (!data) continue;
        if (queryKey[2] === "timeline") {
          const timeline = data as InfiniteData<FeatureHighlightTimelinePage, string | null>;
          queryClient.setQueryData<InfiniteData<FeatureHighlightTimelinePage, string | null>>(queryKey, {
            ...timeline,
            pages: timeline.pages.map((page) => ({
              ...page,
              seenHighlightIds: withSeenIds(page.seenHighlightIds, highlightIds),
            })),
          });
          continue;
        }
        const response = data as FeatureHighlightsResponse;
        queryClient.setQueryData<FeatureHighlightsResponse>(queryKey, {
          highlights: response.highlights.filter((highlight) => !seenIds.has(highlight.id)),
          seenHighlightIds: withSeenIds(response.seenHighlightIds, highlightIds),
        });
      }
      return { previousData };
    },
    onError: (_error, _request, context) => {
      for (const [queryKey, data] of context?.previousData ?? []) {
        queryClient.setQueryData(queryKey, data);
      }
    },
  });
}
