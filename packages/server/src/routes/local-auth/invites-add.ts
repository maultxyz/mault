import { Hono } from "hono";
import { authProvider } from "../../auth";
import { inviteCaptureStorage, type InviteCapture } from "../../auth/invite-capture";
import { getOwnAuth } from "../../auth/own-auth-instance";
import { getWebUrl } from "../../lib/constants/urls";
import {
  requireAuth,
  requireOrg,
  requireOrgRole,
  type AppEnv,
} from "../../middleware/auth";
import { authErrorResponse } from "./shared";
import type { OrgRole } from "@magic-vault/shared";

export const addInviteRoute = new Hono<AppEnv>().post(
  "/invites",
  requireAuth,
  requireOrg,
  requireOrgRole("owner", "admin"),
  async (c) => {
    const { email, role } = await c.req.json<{
      email?: string;
      role?: OrgRole;
    }>();
    if (!email) {
      return c.json({ success: false, message: "Email is required." }, 400);
    }
    try {
      const capture: InviteCapture = {};
      const result = await inviteCaptureStorage.run(capture, () =>
        getOwnAuth().inviteMember({
          organisationId: c.get("orgId"),
          email,
          role,
          invitedByUserId: c.get("userId"),
        }),
      );
      const webUrl = getWebUrl();
      let inviteUrl: string | null = null;
      if (capture.token) {
        const orgName = await authProvider.getOrganisationName(c.get("orgId"));
        const params = new URLSearchParams({ token: capture.token, org: orgName });
        inviteUrl = `${webUrl}/auth/join?${params.toString()}`;
      }
      return c.json({
        success: true,
        data: {
          invitation: result.invitation,
          inviteUrl,
          emailSent: capture.emailSent ?? false,
        },
      });
    } catch (err) {
      const { message, status } = authErrorResponse(err);
      return c.json({ success: false, message }, status);
    }
  },
);
