import { Hono } from "hono";
import { authProvider } from "../../auth";
import { inviteCaptureStorage, type InviteCapture } from "../../auth/invite-capture";
import { getOwnAuth } from "../../auth/own-auth-instance";
import type { OrgRole } from "../../auth/types";
import { getWebUrl } from "../../lib/constants/urls";
import {
  requireAuth,
  requireOrg,
  requireOrgRole,
  type AppEnv,
} from "../../middleware/auth";
import { authErrorResponse } from "./shared";

// Org invites - code/link-based rather than requiring a real email provider
// to be configured (see LocalEmailProvider/inviteCaptureStorage for why:
// own-auth's inviteMember() only ever returns the raw token to the caller
// when exposeRawTokens is set, which is blocked in production). The invite
// still goes through own-auth's real inviteMember/acceptInvite flow -
// membership, roles, expiry, and permission checks are all its own, this
// just replaces "email the link" with "hand the admin a link to share".
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
        // The org name here is purely a display hint for the recipient
        // before they sign in - not security-load-bearing. Accepting the
        // invite always re-validates everything against the real token
        // server-side, so a tampered name in a hand-edited URL couldn't
        // grant access to a different org, only show a misleading label.
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
