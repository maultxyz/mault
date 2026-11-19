import { useMarkFeatureHighlightsSeen } from "@/features/feature-highlights/api/use-mark-feature-highlights-seen";
import {
  FEATURE_HIGHLIGHT_ID_ATTRIBUTE,
  FEATURE_HIGHLIGHT_SEEN_DEBOUNCE_MS,
  FEATURE_HIGHLIGHT_SEEN_DWELL_MS,
  FEATURE_HIGHLIGHT_SEEN_THRESHOLDS,
  FEATURE_HIGHLIGHT_SEEN_VISIBLE_SHARE,
} from "@/lib/constants/feature-highlights";
import { useEffect, useRef, type RefObject } from "react";

function isMostlyVisible(entry: IntersectionObserverEntry): boolean {
  if (!entry.isIntersecting) return false;
  if (entry.intersectionRatio >= FEATURE_HIGHLIGHT_SEEN_VISIBLE_SHARE) return true;
  const viewportHeight = entry.rootBounds?.height ?? window.innerHeight;
  return (
    entry.intersectionRect.height >=
    viewportHeight * FEATURE_HIGHLIGHT_SEEN_VISIBLE_SHARE
  );
}

export function useMarkFeatureHighlightsSeenWhenViewed(
  containerRef: RefObject<HTMLElement | null>,
  unseenHighlightIds: string[],
  isEnabled: boolean,
): void {
  const { mutate } = useMarkFeatureHighlightsSeen();
  const mutateRef = useRef(mutate);
  const pendingIdsRef = useRef(new Set<string>());
  const markedIdsRef = useRef(new Set<string>());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unseenKey = unseenHighlightIds.join("\n");

  useEffect(() => {
    mutateRef.current = mutate;
  }, [mutate]);

  useEffect(() => {
    const pendingIds = pendingIdsRef.current;
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      if (pendingIds.size > 0) mutateRef.current([...pendingIds]);
      pendingIds.clear();
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!isEnabled || !container || !unseenKey) return;
    const unseenIds = new Set(unseenKey.split("\n"));
    const pendingIds = pendingIdsRef.current;
    const markedIds = markedIdsRef.current;

    const flush = () => {
      flushTimerRef.current = null;
      if (pendingIds.size === 0) return;
      const highlightIds = [...pendingIds];
      pendingIds.clear();
      mutateRef.current(highlightIds);
    };

    const dwellTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const markViewed = (highlightId: string, element: Element) => {
      dwellTimers.delete(highlightId);
      markedIds.add(highlightId);
      pendingIds.add(highlightId);
      observer.unobserve(element);
      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(
          flush,
          FEATURE_HIGHLIGHT_SEEN_DEBOUNCE_MS,
        );
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const highlightId = entry.target.getAttribute(
            FEATURE_HIGHLIGHT_ID_ATTRIBUTE,
          );
          if (!highlightId || markedIds.has(highlightId)) continue;
          const dwellTimer = dwellTimers.get(highlightId);
          if (!isMostlyVisible(entry)) {
            if (dwellTimer) clearTimeout(dwellTimer);
            dwellTimers.delete(highlightId);
            continue;
          }
          if (dwellTimer) continue;
          const element = entry.target;
          dwellTimers.set(
            highlightId,
            setTimeout(
              () => markViewed(highlightId, element),
              FEATURE_HIGHLIGHT_SEEN_DWELL_MS,
            ),
          );
        }
      },
      { threshold: FEATURE_HIGHLIGHT_SEEN_THRESHOLDS },
    );

    container
      .querySelectorAll(`[${FEATURE_HIGHLIGHT_ID_ATTRIBUTE}]`)
      .forEach((element) => {
        const highlightId = element.getAttribute(FEATURE_HIGHLIGHT_ID_ATTRIBUTE);
        if (highlightId && unseenIds.has(highlightId) && !markedIds.has(highlightId)) {
          observer.observe(element);
        }
      });
    return () => {
      dwellTimers.forEach((dwellTimer) => clearTimeout(dwellTimer));
      observer.disconnect();
    };
  }, [containerRef, isEnabled, unseenKey]);
}
