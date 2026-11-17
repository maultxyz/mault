import { PRESET_STAGE_PATH_SEPARATOR } from "./constants/sort-bins.constant";
import type {
  PresetWorkflow,
  PresetWorkflowStep,
} from "./interfaces/sort-bins.interface";

export function orderedWorkflowSteps(workflow: PresetWorkflow): PresetWorkflowStep[] {
  return [...workflow.steps].sort((a, b) => a.position - b.position);
}

export function firstWorkflowStep(workflow: PresetWorkflow): PresetWorkflowStep | undefined {
  return orderedWorkflowSteps(workflow)[0];
}

export function workflowStepNumber(workflow: PresetWorkflow, step: PresetWorkflowStep): number {
  return orderedWorkflowSteps(workflow).findIndex((candidate) => candidate.guid === step.guid) + 1;
}

function adjacentWorkflowStep(
  workflow: PresetWorkflow,
  step: PresetWorkflowStep,
  direction: 1 | -1,
): PresetWorkflowStep | null {
  const steps = orderedWorkflowSteps(workflow);
  const index = steps.findIndex((candidate) => candidate.guid === step.guid);
  return index < 0 ? null : (steps[index + direction] ?? null);
}

export function nextWorkflowStep(
  workflow: PresetWorkflow,
  step: PresetWorkflowStep,
): PresetWorkflowStep | null {
  return adjacentWorkflowStep(workflow, step, 1);
}

export function previousWorkflowStep(
  workflow: PresetWorkflow,
  step: PresetWorkflowStep,
): PresetWorkflowStep | null {
  return adjacentWorkflowStep(workflow, step, -1);
}

export function activeWorkflowStep(workflow: PresetWorkflow | null | undefined): PresetWorkflowStep | null {
  if (!workflow?.isActive || !workflow.activeStepGuid) return null;
  return workflow.steps.find((step) => step.guid === workflow.activeStepGuid) ?? null;
}

export function activeWorkflowForGame(
  workflows: PresetWorkflow[],
  gameGuid: string | null | undefined,
): PresetWorkflow | null {
  return (
    workflows.find(
      (workflow) => workflow.isActive && workflow.gameGuid === (gameGuid ?? null),
    ) ?? null
  );
}

export function workflowStepLabel(
  workflow: PresetWorkflow,
  step: PresetWorkflowStep,
  presetName: (presetGuid: string) => string,
): string {
  return [workflow.name, presetName(step.presetGuid)].join(PRESET_STAGE_PATH_SEPARATOR);
}
