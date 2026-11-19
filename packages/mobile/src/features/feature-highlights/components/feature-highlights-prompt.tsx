import { useQuery } from "@tanstack/react-query";
import type { FeatureHighlight } from "@magic-vault/shared";
import { useIsFocused, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  unseenFeatureHighlightsQueryOptions,
  useMarkFeatureHighlightsSeen,
} from "@/features/feature-highlights/api/feature-highlights";
import { FeatureHighlightsSheet } from "@/features/feature-highlights/components/feature-highlights-sheet";
import { useSession } from "@/lib/auth/session";
import type { FeatureHighlightsPromptProps } from "@/lib/interfaces/feature-highlights";

export function FeatureHighlightsPrompt({ isHomeLoaded }: FeatureHighlightsPromptProps) {
  const { user } = useSession();
  const router = useRouter();
  const isScreenFocused = useIsFocused();
  const unseenHighlights = useQuery(unseenFeatureHighlightsQueryOptions(user?.id ?? null, isHomeLoaded));
  const markSeen = useMarkFeatureHighlightsSeen();
  const [presentedHighlights, setPresentedHighlights] = useState<FeatureHighlight[] | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const highlights = unseenHighlights.data?.highlights;

  useEffect(() => {
    if (presentedHighlights !== null || !isScreenFocused || !highlights?.length) return;
    setPresentedHighlights(highlights);
    setIsSheetOpen(true);
  }, [presentedHighlights, isScreenFocused, highlights]);

  return (
    <FeatureHighlightsSheet
      visible={isSheetOpen && isScreenFocused}
      highlights={presentedHighlights ?? []}
      onClose={(shownHighlightIds) => {
        setIsSheetOpen(false);
        if (shownHighlightIds.length > 0) markSeen.mutate({ highlightIds: shownHighlightIds });
      }}
      onOpenTimeline={(shownHighlightIds) => {
        setIsSheetOpen(false);
        if (shownHighlightIds.length > 0) markSeen.mutate({ highlightIds: shownHighlightIds });
        router.push("/whats-new");
      }}
    />
  );
}
