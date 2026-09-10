import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { loadSets, resetAutoAssignBins, snapshotBinSet } from "./shared";

export const resetAutoAssignRoute = new Hono<AppEnv>().post(
  "/:guid/auto-assign/reset",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const target = await tx.query.binSets.findFirst({
          where: (binSets, { eq, and }) =>
            and(eq(binSets.guid, guid), eq(binSets.orgId, orgId)),
          columns: { id: true, guid: true },
        });
        if (!target) return { message: "Set not found.", success: false };

        await snapshotBinSet(tx, target.id, target.guid!, orgId);
        await resetAutoAssignBins(tx, target.id);
        return loadSets(tx, orgId);
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
