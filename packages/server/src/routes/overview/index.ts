import { Hono } from "hono";
import { authQuery } from "../../db";
import { loadOrgOverview } from "../../lib/org-overview";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

const router = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const data = await authQuery(c.get("jwtClaims"), (tx) =>
      loadOrgOverview(tx, c.get("orgId")),
    );
    return c.json({ success: true, data });
  },
);

export { router as overviewRouter };
