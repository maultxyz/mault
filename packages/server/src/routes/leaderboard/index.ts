import { LEADERBOARD_INCLUDE_SELF_HOSTED_PARAM } from "@magic-vault/shared";
import { Hono } from "hono";
import { loadLeaderboard } from "../../lib/leaderboard";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

const router = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const includeSelfHosted =
      c.req.query(LEADERBOARD_INCLUDE_SELF_HOSTED_PARAM) === "true";
    const data = await loadLeaderboard(c.get("orgId"), includeSelfHosted);
    return c.json({ success: true, data });
  },
);

export { router as leaderboardRouter };
