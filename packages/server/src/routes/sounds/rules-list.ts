import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { findGameId, loadSoundRules } from "./shared";

export const listSoundRulesRoute = new Hono<AppEnv>().get(
  "/rules",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const gameGuid = c.req.query("gameGuid");
    if (!gameGuid) {
      return c.json({ success: false, message: "Missing gameGuid." }, 400);
    }
    try {
      const rules = await authQuery(c.get("jwtClaims"), async (tx) => {
        const gameId = await findGameId(tx, gameGuid);
        return gameId === null ? [] : loadSoundRules(tx, orgId, gameId);
      });
      return c.json({ success: true, data: rules });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
