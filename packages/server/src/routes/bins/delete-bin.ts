import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { bins } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { resolveGameId } from "./shared";

export const deleteBinRoute = new Hono<AppEnv>().delete(
  "/bins/:binNumber",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const binNumber = parseInt(c.req.param("binNumber"));
    const gameGuid = c.req.query("gameGuid");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const gameId = await resolveGameId(tx, gameGuid);
        const activeBinSet = await tx.query.binSets.findFirst({
          where: (binSets, { eq, and, isNull }) =>
            gameId === null
              ? and(
                  eq(binSets.isActive, true),
                  isNull(binSets.gameId),
                  eq(binSets.orgId, orgId),
                )
              : and(
                  eq(binSets.isActive, true),
                  eq(binSets.gameId, gameId),
                  eq(binSets.orgId, orgId),
                ),
          columns: { id: true },
          with: { bins: { columns: { id: true, binNumber: true } } },
        });
        if (!activeBinSet)
          return { message: "No active set found.", success: false };
        const existing = activeBinSet.bins.find((b) => b.binNumber === binNumber);
        if (existing) await tx.delete(bins).where(eq(bins.id, existing.id));
        return {
          message: "Successfully cleared bin config.",
          success: true,
          data: null,
        };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
