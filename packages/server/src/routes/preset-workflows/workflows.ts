import {
  SET_NAME_MAX_LENGTH,
} from "@magic-vault/shared";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { presetWorkflowSteps, presetWorkflows } from "../../db/schema";
import {
  findLivePreset,
  presetWorkflowNameTaken as workflowNameTaken,
} from "../../lib/preset-workflows";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { resolveGameId } from "../bins/shared";
import { presetWorkflowsResult } from "./shared";

function validName(name: unknown): string | null {
  const trimmed = typeof name === "string" ? name.trim() : "";
  return trimmed && trimmed.length <= SET_NAME_MAX_LENGTH ? trimmed : null;
}

export const presetWorkflowsCrudRoute = new Hono<AppEnv>()
  .get("/", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    return c.json(
      await authQuery(c.get("jwtClaims"), (tx) =>
        presetWorkflowsResult(tx, orgId),
      ),
    );
  })
  .post("/", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const body = await c.req.json<{
      name: string;
      gameGuid?: string;
      firstPresetGuid: string;
    }>();
    const name = validName(body.name);
    if (!name || typeof body.firstPresetGuid !== "string") {
      return c.json({ success: false, message: "Invalid multi-stage preset." }, 400);
    }
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const gameId = await resolveGameId(tx, body.gameGuid);
      if (await workflowNameTaken(tx, orgId, gameId, name)) {
        return {
          success: false as const,
          status: 409 as const,
          message: `A multi-stage preset named "${name}" already exists.`,
        };
      }
      const firstPreset = await findLivePreset(tx, orgId, body.firstPresetGuid);
      if (!firstPreset || firstPreset.gameId !== gameId) {
        return { success: false as const, message: "Preset not found." };
      }
      const [workflow] = await tx
        .insert(presetWorkflows)
        .values({ name, gameId, orgId })
        .returning({ id: presetWorkflows.id, guid: presetWorkflows.guid });
      await tx.insert(presetWorkflowSteps).values({
        workflowId: workflow.id,
        position: 0,
        presetGuid: body.firstPresetGuid,
        isResortMode: false,
        orgId,
      });
      return {
        ...(await presetWorkflowsResult(tx, orgId)),
        createdGuid: workflow.guid!,
      };
    });
    if ("status" in result) return c.json(result, result.status);
    return c.json(result);
  })
  .put("/:guid", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const body = await c.req.json<{ name: string }>();
    const name = validName(body.name);
    if (!name) {
      return c.json({ success: false, message: "Invalid name." }, 400);
    }
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const [target] = await tx
        .select({ id: presetWorkflows.id, gameId: presetWorkflows.gameId })
        .from(presetWorkflows)
        .where(
          and(
            eq(presetWorkflows.guid, guid),
            eq(presetWorkflows.orgId, orgId),
            eq(presetWorkflows.isDeleted, false),
          ),
        )
        .limit(1);
      if (!target) {
        return { success: false as const, message: "Multi-stage preset not found." };
      }
      if (await workflowNameTaken(tx, orgId, target.gameId, name, guid)) {
        return {
          success: false as const,
          status: 409 as const,
          message: `A multi-stage preset named "${name}" already exists.`,
        };
      }
      await tx
        .update(presetWorkflows)
        .set({ name, updatedAt: new Date() })
        .where(eq(presetWorkflows.id, target.id));
      return presetWorkflowsResult(tx, orgId);
    });
    if ("status" in result) return c.json(result, result.status);
    return c.json(result);
  })
  .delete("/:guid", requireAuth, requireOrg, async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const [deleted] = await tx
        .update(presetWorkflows)
        .set({ isDeleted: true, isActive: false, activeStepGuid: null, updatedAt: new Date() })
        .where(
          and(
            eq(presetWorkflows.guid, guid),
            eq(presetWorkflows.orgId, orgId),
            eq(presetWorkflows.isDeleted, false),
          ),
        )
        .returning({ id: presetWorkflows.id });
      if (!deleted) {
        return { success: false as const, message: "Multi-stage preset not found." };
      }
      return presetWorkflowsResult(tx, orgId);
    });
    return c.json(result);
  });
