import type { BinRuleGroup, RepackSlot } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { binSets } from "../../db/schema";
import {
  isRepackAllowed,
  REPACK_UPGRADE_MESSAGE,
} from "../../lib/repack-access";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { clearAllBinRules, loadSets, snapshotBinSet } from "./shared";

function toSiftRules(rules: BinRuleGroup | null): BinRuleGroup | null {
  return rules && rules.conditions.length > 0 ? rules : null;
}

function toUniqueBy(uniqueBy: string | null): string | null {
  const trimmed = uniqueBy?.trim();
  return trimmed ? trimmed : null;
}

export const setRepackRoute = new Hono<AppEnv>().put(
  "/:guid/repack",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const {
      isRepackMode,
      repackSlots,
      repackUniqueBy,
      repackSiftRules,
      repackMultiplePacks,
    } = await c.req.json<{
      isRepackMode: boolean;
      repackSlots: RepackSlot[];
      repackUniqueBy?: string | null;
      repackSiftRules?: BinRuleGroup | null;
      repackMultiplePacks?: boolean;
    }>();
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const target = await tx.query.binSets.findFirst({
        where: (t, { eq, and }) =>
          and(eq(t.guid, guid), eq(t.orgId, orgId), eq(t.isDeleted, false)),
        columns: { id: true, guid: true, isRepackMode: true },
      });
      if (!target) return { message: "Set not found.", success: false };
      if (
        isRepackMode &&
        !target.isRepackMode &&
        !(await isRepackAllowed(tx, orgId))
      ) {
        return {
          success: false,
          message: REPACK_UPGRADE_MESSAGE,
          upgradeRequired: true,
        };
      }

      if (isRepackMode && !target.isRepackMode) {
        await snapshotBinSet(tx, target.id, target.guid!, orgId);
        await clearAllBinRules(tx, target.id);
      }

      await tx
        .update(binSets)
        .set({
          isRepackMode,
          repackSlots,
          ...(repackUniqueBy !== undefined && {
            repackUniqueBy: toUniqueBy(repackUniqueBy),
          }),
          ...(repackSiftRules !== undefined && {
            repackSiftRules: toSiftRules(repackSiftRules),
          }),
          ...(typeof repackMultiplePacks === "boolean" && {
            repackMultiplePacks,
          }),
          updatedAt: new Date(),
        })
        .where(eq(binSets.id, target.id));
      return loadSets(tx, orgId);
    });
    return c.json(result);
  },
);
