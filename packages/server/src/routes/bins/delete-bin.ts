import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { bins } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { resolveGameId, activeBinSetWhere } from "./shared";

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
          where: (t) => activeBinSetWhere(t, orgId, gameId),
          columns: { id: true },
          with: {
            bins: {
              where: (bin, { eq }) => eq(bin.isDeleted, false),
              columns: { id: true, binNumber: true },
            },
          },
        });
        if (!activeBinSet)
          return { message: "No active set found.", success: false };
        const existing = activeBinSet.bins.find(
          (b) => b.binNumber === binNumber,
        );
        if (existing) {
          await tx
            .update(bins)
            .set({ isDeleted: true })
            .where(eq(bins.id, existing.id));
        }
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
