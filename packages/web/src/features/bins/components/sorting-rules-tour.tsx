import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import {
  MANUAL_RULES_TOUR_STEP_IDS,
  SORTING_RULES_TOUR_STEPS,
} from "@/features/bins/lib/sorting-rules-tour";
import { TourHelpButton } from "@/features/onboarding/components/tour-help-button";
import { toTourStep } from "@/features/onboarding/lib/tour-steps";
import { SORTING_RULES_TOUR_COMPLETED_KEY } from "@/lib/constants/storage-keys";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function SortingRulesTour({ className }: { className?: string }) {
  const { t } = useTranslation("onboarding");
  const { selectedSet } = useBinConfigs();
  const isAutoAssignEnabled = !!selectedSet?.autoAssignField;

  const steps = useMemo(
    () =>
      SORTING_RULES_TOUR_STEPS.filter(
        (config) =>
          !isAutoAssignEnabled || !MANUAL_RULES_TOUR_STEP_IDS.has(config.id),
      ).map((config) => toTourStep(config, t)),
    [t, isAutoAssignEnabled],
  );

  return (
    <TourHelpButton
      steps={steps}
      completedKey={SORTING_RULES_TOUR_COMPLETED_KEY}
      tooltip={t("sortingRulesTour.triggerTooltip")}
      className={className}
    />
  );
}
