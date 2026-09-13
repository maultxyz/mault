import type { RepackSlot } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { binSets } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { clearAllBinRules, loadSets, snapshotBinSet } from "./shared";

export const setRepackRoute = new Hono<AppEnv>().put(
  "/:guid/repack",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const { isRepackMode, repackSlots, repackAllowDuplicates } =
      await c.req.json<{
        isRepackMode: boolean;
        repackSlots: RepackSlot[];
        repackAllowDuplicates: boolean;
      }>();
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const target = await tx.query.binSets.findFirst({
          where: (t, { eq, and }) => and(eq(t.guid, guid), eq(t.orgId, orgId)),
          columns: { id: true, guid: true, isRepackMode: true },
        });
        if (!target) return { message: "Set not found.", success: false };

        if (isRepackMode && !target.isRepackMode) {
          await snapshotBinSet(tx, target.id, target.guid!, orgId);
          await clearAllBinRules(tx, target.id);
        }

        await tx
          .update(binSets)
          .set({
            isRepackMode,
            repackSlots,
            repackAllowDuplicates,
            updatedAt: new Date(),
          })
          .where(eq(binSets.id, target.id));
        return loadSets(tx, orgId);
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
