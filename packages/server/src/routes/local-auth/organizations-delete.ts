import { Hono } from "hono";
import { getOwnAuth } from "../../auth/own-auth-instance";
import { authQuery } from "../../db";
import { purgeOrgData } from "../../lib/org-purge";
import {
  requireAuth,
  requireOrg,
  requireOrgRole,
  type AppEnv,
} from "../../middleware/auth";
import { authErrorResponse } from "./shared";

export const deleteOrganizationRoute = new Hono<AppEnv>().delete(
  "/organizations",
  requireAuth,
  requireOrg,
  requireOrgRole("owner"),
  async (c) => {
    const orgId = c.get("orgId");
    try {
      await authQuery(c.get("jwtClaims"), async (tx) => {
        await purgeOrgData(tx, orgId);
        await getOwnAuth().deleteOrganisation({
          organisationId: orgId,
          actorUserId: c.get("userId"),
        });
      });
      return c.json({ success: true, data: null });
    } catch (err) {
      const { message, status } = authErrorResponse(err);
      return c.json({ success: false, message }, status);
    }
  },
);
