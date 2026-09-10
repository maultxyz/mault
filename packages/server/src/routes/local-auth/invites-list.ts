import { Hono } from "hono";
import { getOwnAuth } from "../../auth/own-auth-instance";
import {
  requireAuth,
  requireOrg,
  requireOrgRole,
  type AppEnv,
} from "../../middleware/auth";

export const listInvitesRoute = new Hono<AppEnv>().get(
  "/invites",
  requireAuth,
  requireOrg,
  requireOrgRole("owner", "admin"),
  async (c) => {
    const invitations = await getOwnAuth().listInvitations({
      organisationId: c.get("orgId"),
      actorUserId: c.get("userId"),
    });
    return c.json({ success: true, data: invitations });
  },
);
