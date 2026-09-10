import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { buildRoutes } from "./shared";

export const getBinRoutesRoute = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const rows = await tx.query.binRoutes.findMany({
          where: (t, { eq }) => eq(t.orgId, orgId),
        });
        return { success: true, message: "Loaded bin routes.", data: await buildRoutes(tx, orgId, rows) };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
