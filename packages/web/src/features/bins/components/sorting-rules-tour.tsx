import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  isSortingRulesTourCompleted,
  markSortingRulesTourCompleted,
  SORTING_RULES_TOUR_STEPS,
} from "@/features/bins/lib/sorting-rules-tour";
import { TourTooltip } from "@/features/onboarding/components/tour-tooltip";
import { cn } from "@/lib/utils";
import { IconHelpCircle } from "@tabler/icons-react";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { EVENTS, STATUS, useJoyride, type Step } from "react-joyride";

export function SortingRulesTour({ className }: { className?: string }) {
  const { t } = useTranslation("onboarding");

  const steps: Step[] = useMemo(
    () =>
      SORTING_RULES_TOUR_STEPS.map((config) => ({
        target: config.target,
        placement: config.placement,
        title: t(config.titleKey),
        content: t(config.contentKey),
        skipScroll: config.target === "body",
      })),
    [t],
  );

  const { controls, state, Tour, on } = useJoyride({
    steps,
    continuous: true,
    scrollToFirstStep: true,
    tooltipComponent: TourTooltip,
    options: {
      targetWaitTimeout: 4000,
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
      markSortingRulesTourCompleted();
    }
  }, [state.status]);

  const autoStartChecked = useRef(false);
  useEffect(() => {
    if (autoStartChecked.current) return;
    autoStartChecked.current = true;
    if (!isSortingRulesTourCompleted()) controls.start(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              className={cn(className)}
              onClick={() => controls.start(0)}
            >
              <IconHelpCircle />
            </Button>
          }
        />
        <TooltipContent>{t("sortingRulesTour.triggerTooltip")}</TooltipContent>
      </Tooltip>
      {Tour}
    </>
  );
}
