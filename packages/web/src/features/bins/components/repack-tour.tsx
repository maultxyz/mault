import { REPACK_TOUR_STEPS } from "@/features/bins/lib/repack-tour";
import { TourHelpButton } from "@/features/onboarding/components/tour-help-button";
import { toTourStep } from "@/features/onboarding/lib/tour-steps";
import { REPACK_TOUR_COMPLETED_KEY } from "@/lib/constants/storage-keys";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function RepackTour({ className }: { className?: string }) {
  const { t } = useTranslation("onboarding");
  const steps = useMemo(
    () => REPACK_TOUR_STEPS.map((config) => toTourStep(config, t)),
    [t],
  );

  return (
    <TourHelpButton
      steps={steps}
      completedKey={REPACK_TOUR_COMPLETED_KEY}
      tooltip={t("repackTour.triggerTooltip")}
      className={className}
    />
  );
}
