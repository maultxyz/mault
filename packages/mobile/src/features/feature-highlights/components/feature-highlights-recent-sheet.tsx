import { useQuery } from "@tanstack/react-query";
import {
  featureHighlightsQueryOptions,
  useMarkFeatureHighlightsSeen,
} from "@/features/feature-highlights/api/feature-highlights";
import { FeatureHighlightsSheet } from "@/features/feature-highlights/components/feature-highlights-sheet";
import { useSession } from "@/lib/auth/session";
import type { FeatureHighlightsRecentSheetProps } from "@/lib/interfaces/feature-highlights";

export function FeatureHighlightsRecentSheet({ visible, onClose }: FeatureHighlightsRecentSheetProps) {
  const { user } = useSession();
  const recentHighlights = useQuery(featureHighlightsQueryOptions(user?.id ?? null, "recent", visible));
  const markSeen = useMarkFeatureHighlightsSeen();

  return (
    <FeatureHighlightsSheet
      visible={visible}
      highlights={recentHighlights.data?.highlights}
      isLoading={recentHighlights.isPending}
      isLoadError={recentHighlights.isError && !recentHighlights.data}
      isRetrying={recentHighlights.isFetching}
      onRetryLoad={() => void recentHighlights.refetch()}
      onClose={(shownHighlightIds) => {
        onClose();
        const seenHighlightIds = new Set(recentHighlights.data?.seenHighlightIds ?? []);
        const unseenHighlightIds = shownHighlightIds.filter((highlightId) => !seenHighlightIds.has(highlightId));
        if (unseenHighlightIds.length > 0) markSeen.mutate({ highlightIds: unseenHighlightIds });
      }}
    />
  );
}
