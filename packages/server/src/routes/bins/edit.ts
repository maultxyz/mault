import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { binSets } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { binSetNameTaken, loadSets } from "./shared";

export const editBinSetRoute = new Hono<AppEnv>().put(
  "/:guid",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const { name } = await c.req.json<{ name: string }>();
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const target = await tx.query.binSets.findFirst({
          where: (binSets, { eq, and }) =>
            and(eq(binSets.guid, guid), eq(binSets.orgId, orgId)),
          columns: { id: true, gameId: true },
        });
        if (!target) return { message: "Set not found.", success: false };
        if (await binSetNameTaken(tx, orgId, target.gameId, name, guid)) {
          return {
            success: false,
            message: `A set named "${name.trim()}" already exists.`,
            nameTaken: true,
          };
        }
        await tx
          .update(binSets)
          .set({ name, updatedAt: new Date() })
          .where(eq(binSets.id, target.id));
        return loadSets(tx, orgId);
      });
      return c.json(
        result,
        "nameTaken" in result && result.nameTaken ? 409 : 200,
      );
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
