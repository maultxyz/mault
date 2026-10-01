import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { soundRules } from "../../db/schema";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { loadSoundRules } from "./shared";

export const deleteSoundRuleRoute = new Hono<AppEnv>().delete(
  "/rules/:guid",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const guid = c.req.param("guid");
    try {
      const rules = await authQuery(c.get("jwtClaims"), async (tx) => {
        const [deleted] = await tx
          .delete(soundRules)
          .where(and(eq(soundRules.guid, guid), eq(soundRules.orgId, orgId)))
          .returning({ gameId: soundRules.gameId });
        return deleted ? loadSoundRules(tx, orgId, deleted.gameId) : [];
      });
      return c.json({ success: true, data: rules });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
