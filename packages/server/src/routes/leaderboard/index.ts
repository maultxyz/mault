import { Hono } from "hono";
import { loadLeaderboard } from "../../lib/leaderboard";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

const router = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const data = await loadLeaderboard(c.get("orgId"));
    return c.json({ success: true, data });
  },
);

export { router as leaderboardRouter };
