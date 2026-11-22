import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useHasBusinessTools } from "@/features/business/api/use-has-business-tools";
import { useTour } from "@/features/onboarding/api/use-tour";
import { isTourCompleted } from "@/features/onboarding/lib/tour-storage";
import { toTourStep } from "@/features/onboarding/lib/tour-steps";
import {
  BUSINESS_TOUR_AUTO_START_POLL_MS,
  BUSINESS_TOUR_AUTO_START_TIMEOUT_MS,
} from "@/lib/constants/tours";
import type { BusinessTourProps } from "@/lib/interfaces/tours";
import { cn } from "@/lib/utils";
import { IconHelpCircle } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Step } from "react-joyride";

function isOnPage(step: Step): boolean {
  if (step.target === "body" || typeof step.target !== "string") return true;
  return document.querySelector(step.target) !== null;
}

function BusinessTourButton({ tour, className, autoStart = true }: BusinessTourProps) {
  const { t } = useTranslation("onboarding");
  const allSteps = useMemo(
    () => tour.steps.map((config) => toTourStep(config, t)),
    [tour, t],
  );
  const [shownSteps, setShownSteps] = useState<Step[]>(allSteps);
  const [startRequest, setStartRequest] = useState(0);
  const { controls, Tour } = useTour({
    steps: shownSteps,
    completedKey: tour.completedKey,
    autoStart: false,
  });

  const start = () => {
    setShownSteps(allSteps.filter(isOnPage));
    setStartRequest((request) => request + 1);
  };

  useEffect(() => {
    if (startRequest > 0) controls.start(0);
  }, [startRequest, controls]);

  useEffect(() => {
    if (!autoStart || isTourCompleted(tour.completedKey)) return;
    const pageSteps = allSteps.filter((step) => step.target !== "body");
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const isReady = pageSteps.some(isOnPage);
      if (isReady || Date.now() - startedAt >= BUSINESS_TOUR_AUTO_START_TIMEOUT_MS) {
        window.clearInterval(timer);
        setShownSteps(allSteps.filter(isOnPage));
        setStartRequest((request) => request + 1);
      }
    }, BUSINESS_TOUR_AUTO_START_POLL_MS);
    return () => window.clearInterval(timer);
  }, [autoStart, allSteps, tour.completedKey]);

  const tooltip = t(tour.triggerTooltipKey);

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={tooltip}
              variant="outline"
              size="icon"
              className={cn(className)}
              onClick={start}
            >
              <IconHelpCircle />
            </Button>
          }
        />
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
      {Tour}
    </>
  );
}

export function BusinessTour(props: BusinessTourProps) {
  const hasBusinessTools = useHasBusinessTools();
  return hasBusinessTools ? <BusinessTourButton {...props} /> : null;
}
