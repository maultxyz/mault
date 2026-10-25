import { Hono } from "hono";
import { loadLeaderboard } from "../../lib/leaderboard";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { databaseErrorResponse } from "../../lib/database-error-response";

const router = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    try {
      const data = await loadLeaderboard(c.get("orgId"));
      return c.json({ success: true, data });
    } catch (err) {
      return databaseErrorResponse(c, err);
    }
  },
);

export { router as leaderboardRouter };
