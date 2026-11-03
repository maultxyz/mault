import type { PresetWorkflowStageInput } from "@magic-vault/shared";
import { eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { presetWorkflowSteps, presetWorkflows } from "../../db/schema";
import { findLivePreset, findPresetWorkflow } from "../../lib/preset-workflows";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { presetWorkflowsResult } from "./shared";

function isStageInput(value: unknown): value is PresetWorkflowStageInput {
  const stage = value as PresetWorkflowStageInput;
  return (
    !!stage &&
    typeof stage.presetGuid === "string" &&
    typeof stage.isResortMode === "boolean" &&
    (stage.stepGuid === null || typeof stage.stepGuid === "string")
  );
}

export const presetWorkflowStepsRoute = new Hono<AppEnv>().put(
  "/:guid/steps",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const { stages } = await c.req.json<{ stages: PresetWorkflowStageInput[] }>();
    if (!Array.isArray(stages) || stages.length === 0 || !stages.every(isStageInput)) {
      return c.json({ success: false, message: "Invalid stages." }, 400);
    }
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const found = await findPresetWorkflow(tx, orgId, guid);
      if (!found) {
        return { success: false as const, message: "Multi-stage preset not found." };
      }
      const keptGuids = stages.flatMap((stage) => (stage.stepGuid ? [stage.stepGuid] : []));
      if (
        new Set(keptGuids).size !== keptGuids.length ||
        keptGuids.some((stepGuid) => !found.steps.some((step) => step.guid === stepGuid))
      ) {
        return { success: false as const, message: "Stage not found." };
      }
      for (const presetGuid of new Set(stages.map((stage) => stage.presetGuid))) {
        const preset = await findLivePreset(tx, orgId, presetGuid);
        if (!preset || preset.gameId !== found.workflow.gameId) {
          return { success: false as const, message: "Preset not found." };
        }
      }
      const removedIds = found.steps
        .filter((step) => !keptGuids.includes(step.guid))
        .map((step) => step.id);
      if (removedIds.length) {
        await tx
          .update(presetWorkflowSteps)
          .set({ isDeleted: true, updatedAt: new Date() })
          .where(inArray(presetWorkflowSteps.id, removedIds));
      }
      for (const [position, stage] of stages.entries()) {
        const values = {
          position,
          presetGuid: stage.presetGuid,
          isResortMode: position > 0 && stage.isResortMode,
          updatedAt: new Date(),
        };
        const existing = found.steps.find((step) => step.guid === stage.stepGuid);
        if (existing) {
          await tx
            .update(presetWorkflowSteps)
            .set(values)
            .where(eq(presetWorkflowSteps.id, existing.id));
        } else {
          await tx
            .insert(presetWorkflowSteps)
            .values({ ...values, workflowId: found.workflow.id, orgId });
        }
      }
      const activeStep = found.steps.find(
        (step) => step.guid === found.workflow.activeStepGuid,
      );
      const activeStage = stages.find(
        (stage) => stage.stepGuid === found.workflow.activeStepGuid,
      );
      if (activeStep && activeStage?.presetGuid !== activeStep.presetGuid) {
        await tx
          .update(presetWorkflows)
          .set({ isActive: false, activeStepGuid: null })
          .where(eq(presetWorkflows.id, found.workflow.id));
      }
      return presetWorkflowsResult(tx, orgId);
    });
    return c.json(result);
  },
);
