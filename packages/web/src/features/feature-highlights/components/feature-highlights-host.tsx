import { unseenFeatureHighlightsQueryOptions } from "@/features/feature-highlights/api/feature-highlights";
import { useMarkFeatureHighlightsSeen } from "@/features/feature-highlights/api/use-mark-feature-highlights-seen";
import { FeatureHighlightsDrawer } from "@/features/feature-highlights/components/feature-highlights-drawer";
import { FeatureHighlightsFloatingCard } from "@/features/feature-highlights/components/feature-highlights-floating-card";
import {
  featureHighlightCarouselSlides,
  highlightIdsOf,
} from "@/features/feature-highlights/lib/feature-highlight-slides";
import { isTourCompleted } from "@/features/onboarding/lib/tour-storage";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useStations } from "@/features/scanner/api/use-stations";
import { useImpersonation } from "@/hooks/use-impersonation";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useAuthSession } from "@/lib/auth";
import { FEATURE_HIGHLIGHTS_DEFERRED_PATH_PATTERN } from "@/lib/constants/feature-highlights";
import { ONBOARDING_COMPLETED_KEY } from "@/lib/constants/storage-keys";
import { announcePolitely } from "@/lib/live-announcer";
import { useQuery } from "@tanstack/react-query";
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

  const unseenQuery = useQuery(
    unseenFeatureHighlightsQueryOptions(isImpersonating ? null : userId),
  );
  const slides = useMemo(
    () => featureHighlightCarouselSlides(unseenQuery.data?.highlights ?? []),
    [unseenQuery.data],
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
    slides.length > 0 &&
    !scannerNeedsTheCorner &&
    !onboardingTourPending;
  if (canStartAutomatic && !automaticStarted) setAutomaticStarted(true);
  const isOpen = automaticStarted && !automaticDismissed && slides.length > 0;

  const announcedRef = useRef(false);
  useEffect(() => {
    if (!isOpen || isMobile || announcedRef.current) return;
    announcedRef.current = true;
    announcePolitely(t("featureHighlights.appeared"));
  }, [isOpen, isMobile, t]);

  const markSeenMutation = useMarkFeatureHighlightsSeen();

  const dismiss = () => {
    setAutomaticDismissed(true);
    const highlightIds = highlightIdsOf(slides);
    if (!isImpersonating && highlightIds.length > 0) {
      markSeenMutation.mutate(highlightIds);
    }
  };

  if (isMobile) {
    return (
      <FeatureHighlightsDrawer
        open={isOpen}
        slides={slides}
        onDismiss={dismiss}
        onOpenTimeline={dismiss}
      />
    );
  }

  if (!isOpen) return null;

  return (
    <FeatureHighlightsFloatingCard
      slides={slides}
      onDismiss={dismiss}
      onOpenTimeline={dismiss}
    />
  );
}
