import { useCollections } from "@/features/collections/api/use-collections";
import { useOrg } from "@/features/companies/api/use-organization";
import { OnboardingContext } from "@/features/onboarding/api/use-onboarding";
import {
  ONBOARDING_TOUR_STEPS,
  resolvePagePath,
} from "@/features/onboarding/lib/steps";
import {
  toTourStep,
  waitForTourNavigation,
} from "@/features/onboarding/lib/tour-steps";
import { isTourCompleted } from "@/features/onboarding/lib/tour-storage";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { ONBOARDING_COMPLETED_KEY } from "@/lib/constants/storage-keys";
import type { TourPage } from "@/lib/interfaces/tours";
import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import type { Step } from "react-joyride";
import type { NavigateFunction } from "react-router-dom";
import { useNavigate } from "react-router-dom";

const OnboardingTour = lazy(() =>
  import("@/features/onboarding/components/onboarding-tour").then(
    (module) => ({ default: module.OnboardingTour }),
  ),
);

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

  const [manualTourRun, setManualTourRun] = useState(0);
  const shouldAutoStart =
    !orgLoading &&
    !collectionsLoading &&
    !!activeOrg &&
    !!activeCollection &&
    !isTourCompleted(ONBOARDING_COMPLETED_KEY);

  const contextValue = useMemo(
    () => ({ startTour: () => setManualTourRun((run) => run + 1) }),
    [],
  );

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
      {!isMobile && (manualTourRun > 0 || shouldAutoStart) && (
        <Suspense fallback={null}>
          <OnboardingTour
            key={manualTourRun}
            steps={steps}
            restartCompleted={manualTourRun > 0}
          />
        </Suspense>
      )}
    </OnboardingContext.Provider>
  );
}
