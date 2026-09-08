import { useCollections } from "@/features/collections/api/use-collections";
import { useOrg } from "@/features/companies/api/use-organization";
import { OnboardingContext } from "@/features/onboarding/api/use-onboarding";
import { TourTooltip } from "@/features/onboarding/components/tour-tooltip";
import {
  resolvePagePath,
  TOUR_STEP_CONFIGS,
  type TourPage,
} from "@/features/onboarding/lib/steps";
import {
  isOnboardingCompleted,
  markOnboardingCompleted,
} from "@/features/onboarding/lib/tour-storage";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { EVENTS, STATUS, useJoyride, type Step } from "react-joyride";
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

    await new Promise((resolve) => setTimeout(resolve, 60));
  };
}

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
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
      TOUR_STEP_CONFIGS.map((config) => ({
        target: config.target,
        placement: config.placement,
        title: t(config.titleKey),
        content: t(config.contentKey),
        skipScroll: config.target === "body",
        before: createBeforeHook(config.page, navigate, () => guidRef.current),
      })),
    [t, navigate],
  );

  const { controls, state, Tour, on } = useJoyride({
    steps,
    continuous: true,
    scrollToFirstStep: true,
    tooltipComponent: TourTooltip,
    options: {
      targetWaitTimeout: 6000,
      showProgress: true,
      skipBeacon: true,
      zIndex: 10000,
      arrowColor: "var(--popover)",
      overlayColor: "rgba(0, 0, 0, 0.8)",
    },
    locale: {
      back: t("nav.back"),
      close: t("nav.close"),
      last: t("nav.done"),
      next: t("nav.next"),
      nextWithProgress: t("nav.nextWithProgress"),
      skip: t("nav.skip"),
    },
  });

  useEffect(
    () => on(EVENTS.TARGET_NOT_FOUND, (_data, ctrl) => ctrl.next()),
    [on],
  );

  useEffect(() => {
    if (state.status === STATUS.FINISHED || state.status === STATUS.SKIPPED) {
      markOnboardingCompleted();
    }
  }, [state.status]);

  const autoStartChecked = useRef(false);
  useEffect(() => {
    if (autoStartChecked.current || isMobile) return;
    if (orgLoading || collectionsLoading || !activeOrg || !activeCollection)
      return;
    autoStartChecked.current = true;
    if (!isOnboardingCompleted()) controls.start(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, orgLoading, collectionsLoading, activeOrg, activeCollection]);

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
