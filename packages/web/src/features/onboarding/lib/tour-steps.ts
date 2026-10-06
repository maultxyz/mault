import { TOUR_STEP_NAVIGATION_DELAY_MS } from "@/lib/constants/timing";
import type { TourStepConfig } from "@/lib/interfaces/tours";
import type { TFunction } from "i18next";
import type { Step } from "react-joyride";

export function toTourStep(config: TourStepConfig, t: TFunction): Step {
  return {
    target: config.target,
    placement: config.placement,
    title: t(config.titleKey),
    content: t(config.contentKey),
    skipScroll: config.target === "body",
  };
}

export function waitForTourNavigation(): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, TOUR_STEP_NAVIGATION_DELAY_MS),
  );
}
