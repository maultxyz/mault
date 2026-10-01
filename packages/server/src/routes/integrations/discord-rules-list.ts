import { Hono } from "hono";
import { authQuery } from "../../db";
import { loadNotificationRules } from "../../lib/notification-rules";
import { findGameId } from "../../lib/rule-groups";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const listNotificationRulesRoute = new Hono<AppEnv>().get(
  "/discord/rules",
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
        return gameId === null ? [] : loadNotificationRules(tx, orgId, gameId);
      });
      return c.json({ success: true, data: rules });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
