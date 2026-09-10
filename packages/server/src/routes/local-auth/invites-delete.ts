import { Hono } from "hono";
import { getOwnAuth } from "../../auth/own-auth-instance";
import {
  requireAuth,
  requireOrg,
  requireOrgRole,
  type AppEnv,
} from "../../middleware/auth";
import { authErrorResponse } from "./shared";

export const deleteInviteRoute = new Hono<AppEnv>().delete(
  "/invites/:invitationId",
  requireAuth,
  requireOrg,
  requireOrgRole("owner", "admin"),
  async (c) => {
    try {
      await getOwnAuth().revokeInvitation({
        invitationId: c.req.param("invitationId"),
        actorUserId: c.get("userId"),
      });
      return c.json({ success: true, data: null });
    } catch (err) {
      const { message, status } = authErrorResponse(err);
      return c.json({ success: false, message }, status);
    }
  },
);
