import { TourTooltip } from "@/features/onboarding/components/tour-tooltip";
import {
  isTourCompleted,
  markTourCompleted,
} from "@/features/onboarding/lib/tour-storage";
import {
  TOUR_JOYRIDE_OPTIONS,
  TOUR_TARGET_WAIT_TIMEOUT_MS,
} from "@/lib/constants/tours";
import type { UseTourOptions } from "@/lib/interfaces/tours";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { EVENTS, STATUS, useJoyride } from "react-joyride";

export function useTour({
  steps,
  completedKey,
  autoStart = true,
  targetWaitTimeout = TOUR_TARGET_WAIT_TIMEOUT_MS,
}: UseTourOptions) {
  const { t } = useTranslation("onboarding");

  const { controls, state, Tour, on } = useJoyride({
    steps,
    continuous: true,
    scrollToFirstStep: true,
    tooltipComponent: TourTooltip,
    options: { ...TOUR_JOYRIDE_OPTIONS, targetWaitTimeout },
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
      markTourCompleted(completedKey);
    }
  }, [state.status, completedKey]);

  const autoStartChecked = useRef(false);
  useEffect(() => {
    if (autoStartChecked.current || !autoStart) return;
    autoStartChecked.current = true;
    if (!isTourCompleted(completedKey)) controls.start(0);
  }, [autoStart, completedKey, controls]);

  return { controls, Tour };
}
