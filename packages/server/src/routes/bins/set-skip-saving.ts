import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { binSets } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { loadSets } from "./shared";

export const setSkipSavingRoute = new Hono<AppEnv>().put(
  "/:guid/skip-saving",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    const { skipSaving } = await c.req.json<{ skipSaving: boolean }>();
    if (typeof skipSaving !== "boolean") {
      return c.json({ success: false, message: "Invalid mode." }, 400);
    }
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const target = await tx.query.binSets.findFirst({
        where: (t, { eq, and }) =>
          and(eq(t.guid, guid), eq(t.orgId, orgId), eq(t.isDeleted, false)),
        columns: { id: true },
      });
      if (!target) return { message: "Set not found.", success: false };
      await tx
        .update(binSets)
        .set({ skipSaving, updatedAt: new Date() })
        .where(eq(binSets.id, target.id));
      return loadSets(tx, orgId);
    });
    return c.json(result);
  },
);
