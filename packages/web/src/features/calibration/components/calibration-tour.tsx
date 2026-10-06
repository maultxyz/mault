import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSetupWizard } from "@/features/calibration/api/use-setup-wizard";
import { CALIBRATION_TOUR_STEPS } from "@/features/calibration/lib/calibration-tour";
import { useTour } from "@/features/onboarding/api/use-tour";
import {
  toTourStep,
  waitForTourNavigation,
} from "@/features/onboarding/lib/tour-steps";
import { useSerial } from "@/features/scanner/api/use-serial";
import { CALIBRATION_TOUR_COMPLETED_KEY } from "@/lib/constants/storage-keys";
import type {
  CalibrationSection,
  CalibrationTourProps,
} from "@/lib/interfaces/calibration";
import { cn } from "@/lib/utils";
import { IconHelpCircle, IconRoute, IconWand } from "@tabler/icons-react";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { Step } from "react-joyride";

function createSectionBeforeHook(
  targetSection: CalibrationSection,
  getSection: () => CalibrationSection,
  setSection: (section: CalibrationSection) => void,
) {
  return async () => {
    if (getSection() === targetSection) return;
    setSection(targetSection);
    await waitForTourNavigation();
  };
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
        ...toTourStep(config, t),
        before: createSectionBeforeHook(
          config.section,
          () => sectionRef.current,
          setSection,
        ),
      })),
    [t, setSection],
  );

  const { controls, Tour } = useTour({
    steps,
    completedKey: CALIBRATION_TOUR_COMPLETED_KEY,
  });

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
