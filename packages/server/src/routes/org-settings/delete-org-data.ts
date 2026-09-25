import { Hono } from "hono";
import { authQuery } from "../../db";
import { ActiveSubscriptionError, purgeOrgData } from "../../lib/org-purge";
import {
  requireAuth,
  requireOrg,
  requireOrgRole,
  type AppEnv,
} from "../../middleware/auth";

export const deleteOrgDataRoute = new Hono<AppEnv>().delete(
  "/data",
  requireAuth,
  requireOrg,
  requireOrgRole("owner"),
  async (c) => {
    const orgId = c.get("orgId");
    try {
      await authQuery(c.get("jwtClaims"), (tx) => purgeOrgData(tx, orgId));
      return c.json({ success: true, data: null });
    } catch (err) {
      if (err instanceof ActiveSubscriptionError) {
        return c.json({ success: false, message: err.message }, 409);
      }
      console.error(err);
      return c.json(
        { success: false, message: "Failed to delete organization data." },
        500,
      );
    }
  },
);
