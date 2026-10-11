import { Hono } from "hono";
import { loadLeaderboard } from "../../lib/leaderboard";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

const router = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    try {
      const data = await loadLeaderboard(c.get("orgId"));
      return c.json({ success: true, data });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);

export { router as leaderboardRouter };
