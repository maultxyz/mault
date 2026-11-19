import {
  markFeatureHighlightsSeen,
  recentFeatureHighlightsQueryOptions,
  unseenFeatureHighlightsQueryOptions,
} from "@/features/feature-highlights/api/feature-highlights";
import { FeatureHighlightsDrawer } from "@/features/feature-highlights/components/feature-highlights-drawer";
import { FeatureHighlightsFloatingCard } from "@/features/feature-highlights/components/feature-highlights-floating-card";
import {
  featureHighlightCarouselSlides,
  unseenHighlightIdsOf,
} from "@/features/feature-highlights/lib/feature-highlight-slides";
import { isTourCompleted } from "@/features/onboarding/lib/tour-storage";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useStations } from "@/features/scanner/api/use-stations";
import { useImpersonation } from "@/hooks/use-impersonation";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useAuthSession } from "@/lib/auth";
import {
  FEATURE_HIGHLIGHTS_DEFERRED_PATH_PATTERN,
  FEATURE_HIGHLIGHTS_QUERY_KEY,
} from "@/lib/constants/feature-highlights";
import { ONBOARDING_COMPLETED_KEY } from "@/lib/constants/storage-keys";
import type {
  FeatureHighlightCarouselSlide,
  FeatureHighlightsPanelStatus,
} from "@/lib/interfaces/feature-highlights";
import { announcePolitely } from "@/lib/live-announcer";
import { closeWhatsNew, useWhatsNewState } from "@/lib/whats-new-store";
import type { FeatureHighlightsResponse } from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

export function FeatureHighlightsHost() {
  const { t } = useTranslation("common");
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const { data: authSession } = useAuthSession();
  const userId = authSession?.user?.id ?? null;
  const { isImpersonating } = useImpersonation();
  const { connectedStationIds } = useStations();
  const { isTimerActive } = useScannedCards();
  const whatsNew = useWhatsNewState();
  const queryClient = useQueryClient();

  const unseenQuery = useQuery(
    unseenFeatureHighlightsQueryOptions(isImpersonating ? null : userId),
  );
  const recentQuery = useQuery({
    ...recentFeatureHighlightsQueryOptions(userId),
    enabled: !!userId && whatsNew.isOpen,
  });

  const unseenSlides = useMemo(
    () => featureHighlightCarouselSlides(unseenQuery.data?.highlights ?? []),
    [unseenQuery.data],
  );
  const recentSlides = useMemo(
    () => featureHighlightCarouselSlides(recentQuery.data?.highlights ?? []),
    [recentQuery.data],
  );

  const [automaticStarted, setAutomaticStarted] = useState(false);
  const [automaticDismissed, setAutomaticDismissed] = useState(false);
  const scannerNeedsTheCorner =
    FEATURE_HIGHLIGHTS_DEFERRED_PATH_PATTERN.test(pathname) ||
    connectedStationIds.size > 0 ||
    isTimerActive;
  const onboardingTourPending =
    !isMobile && !isTourCompleted(ONBOARDING_COMPLETED_KEY);
  const canStartAutomatic =
    !isImpersonating &&
    !automaticDismissed &&
    !whatsNew.isOpen &&
    unseenSlides.length > 0 &&
    !scannerNeedsTheCorner &&
    !onboardingTourPending;
  if (canStartAutomatic && !automaticStarted) setAutomaticStarted(true);
  const showsAutomatic =
    automaticStarted &&
    !automaticDismissed &&
    !whatsNew.isOpen &&
    unseenSlides.length > 0;

  const announcedRef = useRef(false);
  useEffect(() => {
    if (!showsAutomatic || isMobile || announcedRef.current) return;
    announcedRef.current = true;
    announcePolitely(t("featureHighlights.appeared"));
  }, [showsAutomatic, isMobile, t]);

  const markSeenMutation = useMutation({
    mutationFn: markFeatureHighlightsSeen,
    onSuccess: (_, highlightIds) => {
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
      queryClient.setQueriesData<FeatureHighlightsResponse>(
        { queryKey: [FEATURE_HIGHLIGHTS_QUERY_KEY, "recent"] },
        (data) =>
          data && {
            ...data,
            seenHighlightIds: [
              ...new Set([...data.seenHighlightIds, ...highlightIds]),
            ],
          },
      );
    },
  });

  const dismiss = (
    slides: FeatureHighlightCarouselSlide[],
    seenHighlightIds: string[],
  ) => {
    setAutomaticDismissed(true);
    closeWhatsNew();
    if (isImpersonating) return;
    const highlightIds = unseenHighlightIdsOf(slides, seenHighlightIds);
    if (highlightIds.length > 0) markSeenMutation.mutate(highlightIds);
  };

  const isOpen = whatsNew.isOpen || showsAutomatic;
  const slides = whatsNew.isOpen ? recentSlides : unseenSlides;
  const seenHighlightIds = whatsNew.isOpen
    ? (recentQuery.data?.seenHighlightIds ?? [])
    : [];
  const status: FeatureHighlightsPanelStatus = !whatsNew.isOpen
    ? "ready"
    : recentQuery.isError && !recentQuery.data
      ? "error"
      : recentQuery.data
        ? "ready"
        : "loading";
  const panelProps = {
    status,
    slides,
    onDismiss: () => dismiss(slides, seenHighlightIds),
    onRetry: () => void recentQuery.refetch(),
  };

  if (isMobile) {
    return (
      <FeatureHighlightsDrawer
        key={whatsNew.openRequestId}
        open={isOpen}
        {...panelProps}
      />
    );
  }

  if (!isOpen) return null;

  return (
    <FeatureHighlightsFloatingCard
      key={whatsNew.isOpen ? `manual-${whatsNew.openRequestId}` : "automatic"}
      movesFocusOnOpen={whatsNew.isOpen}
      {...panelProps}
    />
  );
}
