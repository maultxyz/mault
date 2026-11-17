import type { PresetWorkflowStep } from "@magic-vault/shared";

export interface PresetWorkflowRow {
  id: number;
  guid: string;
  gameId: number | null;
  activeStepGuid: string | null;
}

export interface PresetWorkflowStepRow extends PresetWorkflowStep {
  id: number;
}

export interface PresetWorkflowLookup {
  workflow: PresetWorkflowRow;
  steps: PresetWorkflowStepRow[];
}
