import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { binSets } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { loadSets, resetAutoAssignBins, snapshotBinSet } from "./shared";

export const setAutoAssignRoute = new Hono<AppEnv>().put(
  "/:guid/auto-assign",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const { field } = await c.req.json<{ field: string | null }>();
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const target = await tx.query.binSets.findFirst({
          where: (binSets, { eq, and }) =>
            and(eq(binSets.guid, guid), eq(binSets.orgId, orgId)),
          columns: { id: true, guid: true, autoAssignField: true },
        });
        if (!target) return { message: "Set not found.", success: false };

        if (field && field !== target.autoAssignField) {
          await snapshotBinSet(tx, target.id, target.guid!, orgId);
          await resetAutoAssignBins(tx, target.id);
        }

        await tx
          .update(binSets)
          .set({ autoAssignField: field, updatedAt: new Date() })
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
