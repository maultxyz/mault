import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSetupWizard } from "@/features/calibration/api/use-setup-wizard";
import { useSerial } from "@/features/scanner/api/use-serial";
import {
  CALIBRATION_TOUR_STEPS,
  isCalibrationTourCompleted,
  markCalibrationTourCompleted,
} from "@/features/calibration/lib/calibration-tour";
import type { CalibrationSection } from "@/lib/interfaces/calibration";
import { TourTooltip } from "@/features/onboarding/components/tour-tooltip";
import { TOUR_STEP_NAVIGATION_DELAY_MS } from "@/lib/constants/timing";
import { cn } from "@/lib/utils";
import { IconHelpCircle, IconRoute, IconWand } from "@tabler/icons-react";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { EVENTS, STATUS, useJoyride, type Step } from "react-joyride";

function createSectionBeforeHook(
  targetSection: CalibrationSection,
  getSection: () => CalibrationSection,
  setSection: (section: CalibrationSection) => void,
) {
  return async () => {
    if (getSection() === targetSection) return;
    setSection(targetSection);
    await new Promise((resolve) =>
      setTimeout(resolve, TOUR_STEP_NAVIGATION_DELAY_MS),
    );
  };
}

interface CalibrationTourProps {
  section: CalibrationSection;
  setSection: (section: CalibrationSection) => void;
  className?: string;
}

export function CalibrationTour({
  section,
  setSection,
  className,
}: CalibrationTourProps) {
  const { t } = useTranslation("onboarding");
  const setupWizard = useSetupWizard();
  const { isConnected } = useSerial();
  const sectionRef = useRef(section);
  useEffect(() => {
    sectionRef.current = section;
  }, [section]);

  const steps: Step[] = useMemo(
    () =>
      CALIBRATION_TOUR_STEPS.map((config) => ({
        target: config.target,
        placement: config.placement,
        title: t(config.titleKey),
        content: t(config.contentKey),
        skipScroll: config.target === "body",
        before: createSectionBeforeHook(
          config.section,
          () => sectionRef.current,
          setSection,
        ),
      })),
    [t, setSection],
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
      markCalibrationTourCompleted();
    }
  }, [state.status]);

  const autoStartChecked = useRef(false);
  useEffect(() => {
    if (autoStartChecked.current) return;
    autoStartChecked.current = true;
    if (!isCalibrationTourCompleted()) controls.start(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              className={cn(className)}
              aria-label={t("calibrationTour.triggerTooltip")}
            />
          }
        >
          <IconHelpCircle />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => controls.start(0)}>
            <IconRoute />
            {t("calibrationTour.menu.pageTour")}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!isConnected} onClick={setupWizard.open}>
            <IconWand />
            {t("calibrationTour.menu.setupWizard")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {Tour}
    </>
  );
}
