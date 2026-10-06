import { useCollections } from "@/features/collections/api/use-collections";
import { useOrg } from "@/features/companies/api/use-organization";
import { OnboardingContext } from "@/features/onboarding/api/use-onboarding";
import { useTour } from "@/features/onboarding/api/use-tour";
import {
  ONBOARDING_TOUR_STEPS,
  resolvePagePath,
} from "@/features/onboarding/lib/steps";
import {
  toTourStep,
  waitForTourNavigation,
} from "@/features/onboarding/lib/tour-steps";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { ONBOARDING_COMPLETED_KEY } from "@/lib/constants/storage-keys";
import { ONBOARDING_TOUR_TARGET_WAIT_TIMEOUT_MS } from "@/lib/constants/tours";
import type { TourPage } from "@/lib/interfaces/tours";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Step } from "react-joyride";
import type { NavigateFunction } from "react-router-dom";
import { useNavigate } from "react-router-dom";

function createBeforeHook(
  page: TourPage,
  navigate: NavigateFunction,
  getGuid: () => string | null,
) {
  return async () => {
    const path = resolvePagePath(page, getGuid());
    if (!path || window.location.pathname === path) return;
    navigate(path);
    await waitForTourNavigation();
  };
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation("onboarding");
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { activeOrg, isLoading: orgLoading } = useOrg();
  const { activeCollection, isLoading: collectionsLoading } = useCollections();

  const guidRef = useRef<string | null>(activeCollection?.guid ?? null);
  useEffect(() => {
    guidRef.current = activeCollection?.guid ?? null;
  }, [activeCollection?.guid]);

  const steps: Step[] = useMemo(
    () =>
      ONBOARDING_TOUR_STEPS.map((config) => ({
        ...toTourStep(config, t),
        before: createBeforeHook(config.page, navigate, () => guidRef.current),
      })),
    [t, navigate],
  );

  const { controls, Tour } = useTour({
    steps,
    completedKey: ONBOARDING_COMPLETED_KEY,
    targetWaitTimeout: ONBOARDING_TOUR_TARGET_WAIT_TIMEOUT_MS,
    autoStart:
      !isMobile &&
      !orgLoading &&
      !collectionsLoading &&
      !!activeOrg &&
      !!activeCollection,
  });

  const contextValue = useMemo(
    () => ({ startTour: () => controls.start(0) }),
    [controls],
  );

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
      {!isMobile && Tour}
    </OnboardingContext.Provider>
  );
}
