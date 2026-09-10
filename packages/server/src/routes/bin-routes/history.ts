import { Hono } from "hono";
import { authQuery } from "../../db";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { toBinRoute } from "./shared";

export const binRouteHistoryRoute = new Hono<AppEnv>().get(
  "/history",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    try {
      const result = await authQuery(c.get("jwtClaims"), async (tx) => {
        const rows = await tx.query.binRouteAudit.findMany({
          where: (t, { eq }) => eq(t.orgId, orgId),
          orderBy: (t, { desc }) => [desc(t.createdAt)],
          limit: 30,
        });
        return {
          success: true,
          message: "Loaded history.",
          data: rows.map((r) => ({
            guid: r.guid!,
            route: toBinRoute(r),
            createdAt: r.createdAt.toISOString(),
          })),
        };
      });
      return c.json(result);
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
