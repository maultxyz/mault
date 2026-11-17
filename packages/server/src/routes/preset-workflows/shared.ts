import { loadPresetWorkflows } from "../../lib/preset-workflows";
import type { Transaction } from "../../db";
import { loadSets } from "../bins/shared";

export async function presetWorkflowsResult(tx: Transaction, orgId: string) {
  return {
    success: true as const,
    message: "Loaded multi-stage presets.",
    data: await loadPresetWorkflows(tx, orgId),
  };
}

export async function presetWorkflowsAndPresetsResult(
  tx: Transaction,
  orgId: string,
) {
  const presets = await loadSets(tx, orgId);
  return {
    success: true as const,
    message: "Loaded multi-stage presets.",
    data: {
      workflows: await loadPresetWorkflows(tx, orgId),
      presets: presets.data,
    },
  };
}
