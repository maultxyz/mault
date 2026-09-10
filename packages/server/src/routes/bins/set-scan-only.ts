import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { binSets } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { applyScanOnlyBins, loadSets, snapshotBinSet } from "./shared";

export const setScanOnlyRoute = new Hono<AppEnv>().put(
  "/:guid/scan-only",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const { enabled } = await c.req.json<{ enabled: boolean }>();
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const target = await tx.query.binSets.findFirst({
          where: (binSets, { eq, and }) =>
            and(eq(binSets.guid, guid), eq(binSets.orgId, orgId)),
          columns: { id: true, guid: true, scanOnly: true },
        });
        if (!target) return { message: "Set not found.", success: false };

        if (enabled && !target.scanOnly) {
          await snapshotBinSet(tx, target.id, target.guid!, orgId);
          await applyScanOnlyBins(tx, target.id, orgId);
        }

        await tx
          .update(binSets)
          .set({ scanOnly: enabled, updatedAt: new Date() })
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
