import { useQuery } from "@tanstack/react-query";
import type { FeatureHighlight } from "@magic-vault/shared";
import { useIsFocused } from "expo-router";
import { useEffect, useState } from "react";
import {
  featureHighlightsQueryOptions,
  useMarkFeatureHighlightsSeen,
} from "@/features/feature-highlights/api/feature-highlights";
import { FeatureHighlightsSheet } from "@/features/feature-highlights/components/feature-highlights-sheet";
import { useSession } from "@/lib/auth/session";
import type { FeatureHighlightsPromptProps } from "@/lib/interfaces/feature-highlights";

export function FeatureHighlightsPrompt({ isHomeLoaded }: FeatureHighlightsPromptProps) {
  const { user } = useSession();
  const isScreenFocused = useIsFocused();
  const unseenHighlights = useQuery(featureHighlightsQueryOptions(user?.id ?? null, "unseen", isHomeLoaded));
  const markSeen = useMarkFeatureHighlightsSeen();
  const [presentedHighlights, setPresentedHighlights] = useState<FeatureHighlight[] | null>(null);
  const [hasPresented, setHasPresented] = useState(false);
  const highlights = unseenHighlights.data?.highlights;

  useEffect(() => {
    if (hasPresented || !isScreenFocused || !highlights?.length) return;
    setPresentedHighlights(highlights);
    setHasPresented(true);
  }, [hasPresented, isScreenFocused, highlights]);

  return (
    <FeatureHighlightsSheet
      visible={presentedHighlights !== null && isScreenFocused}
      highlights={presentedHighlights ?? undefined}
      onClose={(shownHighlightIds) => {
        setPresentedHighlights(null);
        if (shownHighlightIds.length > 0) markSeen.mutate({ highlightIds: shownHighlightIds });
      }}
    />
  );
}
