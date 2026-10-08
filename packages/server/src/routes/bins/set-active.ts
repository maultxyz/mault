import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { binSets } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { loadSets, activeBinSetWhere } from "./shared";

export const setBinSetActiveRoute = new Hono<AppEnv>().put(
  "/:guid/active",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const target = await tx.query.binSets.findFirst({
          where: (binSets, { eq, and }) =>
            and(
              eq(binSets.guid, guid),
              eq(binSets.orgId, orgId),
              eq(binSets.isDeleted, false),
            ),
          columns: { id: true, gameId: true },
        });
        if (!target) return { message: "Set not found.", success: false };

        // Only one active set per game (or per "no game") - activating a
        // Gundam set shouldn't deactivate an already-active Magic set.
        await tx
          .update(binSets)
          .set({ isActive: false })
          .where(activeBinSetWhere(binSets, orgId, target.gameId));
        await tx
          .update(binSets)
          .set({ isActive: true })
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
