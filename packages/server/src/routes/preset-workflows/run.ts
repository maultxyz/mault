import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { presetWorkflows } from "../../db/schema";
import {
  deactivatePresetWorkflows,
  findLivePreset,
  findPresetWorkflow,
  switchActivePreset,
} from "../../lib/preset-workflows";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { presetWorkflowsAndPresetsResult } from "./shared";

export const runPresetWorkflowRoute = new Hono<AppEnv>().put(
  "/:guid/steps/:stepGuid/enter",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const stepGuid = c.req.param("stepGuid");
    const { markBinsEmptied } = await c.req
      .json<{ markBinsEmptied?: boolean }>()
      .catch(() => ({ markBinsEmptied: true }));
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const found = await findPresetWorkflow(tx, orgId, guid);
      const step = found?.steps.find((candidate) => candidate.guid === stepGuid);
      if (!found || !step) {
        return { success: false as const, message: "Stage not found." };
      }
      const preset = await findLivePreset(tx, orgId, step.presetGuid);
      if (!preset) {
        return { success: false as const, message: "That stage's preset was deleted." };
      }
      await switchActivePreset(tx, orgId, preset, markBinsEmptied !== false);
      await deactivatePresetWorkflows(tx, orgId, found.workflow.gameId);
      await tx
        .update(presetWorkflows)
        .set({ isActive: true, activeStepGuid: step.guid, updatedAt: new Date() })
        .where(eq(presetWorkflows.id, found.workflow.id));
      return presetWorkflowsAndPresetsResult(tx, orgId);
    });
    return c.json(result);
  },
);
