import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FEATURE_HIGHLIGHTS_INCLUDE_SEEN_PARAM,
  FEATURE_HIGHLIGHTS_PATH,
  FEATURE_HIGHLIGHTS_SEEN_PATH,
  type FeatureHighlightsResponse,
  type MarkFeatureHighlightsSeenRequest,
  type Response,
  type Result,
} from "@magic-vault/shared";
import { apiGet, apiPost, unwrap } from "@/lib/api/client";
import { ApiResultError } from "@/lib/api/api-result-error";
import { FEATURE_HIGHLIGHTS_QUERY_KEY } from "@/lib/constants/feature-highlights";
import type { FeatureHighlightsQueryScope, MarkFeatureHighlightsSeenContext } from "@/lib/interfaces/feature-highlights";

export const featureHighlightsQueryOptions = (
  userId: string | null,
  scope: FeatureHighlightsQueryScope,
  isEnabled: boolean,
) =>
  queryOptions({
    queryKey: [FEATURE_HIGHLIGHTS_QUERY_KEY, userId, scope] as const,
    queryFn: () =>
      unwrap(
        apiGet<Result<FeatureHighlightsResponse>>(
          scope === "recent"
            ? `/api${FEATURE_HIGHLIGHTS_PATH}?${FEATURE_HIGHLIGHTS_INCLUDE_SEEN_PARAM}=1`
            : `/api${FEATURE_HIGHLIGHTS_PATH}`,
        ),
      ),
    enabled: !!userId && isEnabled,
    staleTime: scope === "unseen" ? Infinity : 0,
    refetchOnMount: scope === "recent",
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

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
      const previousResponses = queryClient.getQueriesData<FeatureHighlightsResponse>({
        queryKey: [FEATURE_HIGHLIGHTS_QUERY_KEY],
      });
      const seenIds = new Set(highlightIds);
      for (const [queryKey, response] of previousResponses) {
        if (!response) continue;
        const scope = queryKey[2] as FeatureHighlightsQueryScope;
        queryClient.setQueryData<FeatureHighlightsResponse>(queryKey, {
          highlights:
            scope === "unseen" ? response.highlights.filter((highlight) => !seenIds.has(highlight.id)) : response.highlights,
          seenHighlightIds: [...new Set([...response.seenHighlightIds, ...highlightIds])],
        });
      }
      return { previousResponses };
    },
    onError: (_error, _request, context) => {
      for (const [queryKey, response] of context?.previousResponses ?? []) {
        queryClient.setQueryData(queryKey, response);
      }
    },
  });
}
