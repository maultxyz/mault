import { Hono } from "hono";
import { loadLeaderboard, parseLeaderboardQuery } from "../../lib/leaderboard";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

const router = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const query = parseLeaderboardQuery((name) => c.req.query(name));
    const data = await loadLeaderboard(c.get("orgId"), query);
    return c.json({ success: true, data });
  },
);

export { router as leaderboardRouter };
