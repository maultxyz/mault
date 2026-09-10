import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { binSets } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { loadSets } from "./shared";

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
            and(eq(binSets.guid, guid), eq(binSets.orgId, orgId)),
          columns: { id: true, gameId: true },
        });
        if (!target) return { message: "Set not found.", success: false };

        // Only one active set per game (or per "no game") - activating a
        // Gundam set shouldn't deactivate an already-active Magic set.
        await tx
          .update(binSets)
          .set({ isActive: false })
          .where(
            target.gameId === null
              ? and(
                  eq(binSets.isActive, true),
                  isNull(binSets.gameId),
                  eq(binSets.orgId, orgId),
                )
              : and(
                  eq(binSets.isActive, true),
                  eq(binSets.gameId, target.gameId),
                  eq(binSets.orgId, orgId),
                ),
          );
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
