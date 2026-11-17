import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { usePresetWorkflows } from "@/features/bins/api/use-preset-workflows";
import type { ActivePresetWorkflowState } from "@/lib/interfaces/bins";
import {
  activeWorkflowStep,
  nextWorkflowStep,
  previousWorkflowStep,
  workflowStepLabel,
  workflowStepNumber,
} from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function useActivePresetWorkflow(): ActivePresetWorkflowState {
  const { t } = useTranslation("bins");
  const { sets, selectedSet } = useBinConfigs();
  const { activeWorkflow } = usePresetWorkflows();
  const step = activeWorkflowStep(activeWorkflow);
  const workflow =
    step && step.presetGuid === selectedSet?.guid ? activeWorkflow : null;

  if (!workflow || !step) {
    return {
      workflow: null,
      step: null,
      stageNumber: 0,
      stageCount: 0,
      previousStep: null,
      nextStep: null,
      label: "",
    };
  }
  return {
    workflow,
    step,
    stageNumber: workflowStepNumber(workflow, step),
    stageCount: workflow.steps.length,
    previousStep: previousWorkflowStep(workflow, step),
    nextStep: nextWorkflowStep(workflow, step),
    label: workflowStepLabel(
      workflow,
      step,
      (presetGuid) =>
        sets.find((preset) => preset.guid === presetGuid)?.name ??
        t("presetWorkflows.missingPreset"),
    ),
  };
}
