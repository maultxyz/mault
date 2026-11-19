import { markFeatureHighlightsSeen } from "@/features/feature-highlights/api/feature-highlights";
import { markFeatureHighlightsSeenInCaches } from "@/features/feature-highlights/lib/feature-highlight-cache";
import { FEATURE_HIGHLIGHTS_QUERY_KEY } from "@/lib/constants/feature-highlights";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useMarkFeatureHighlightsSeen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markFeatureHighlightsSeen,
    onMutate: (highlightIds) =>
      markFeatureHighlightsSeenInCaches(queryClient, highlightIds),
    onError: () =>
      queryClient.invalidateQueries({
        queryKey: [FEATURE_HIGHLIGHTS_QUERY_KEY, "timeline"],
      }),
  });
}
