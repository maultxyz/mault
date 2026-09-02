import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { isAuthError } from "own-auth";
import { authProvider } from "../auth";
import {
  inviteCaptureStorage,
  type InviteCapture,
} from "../auth/invite-capture";
import { getOwnAuth } from "../auth/own-auth-instance";
import type { OrgRole } from "../auth/types";
import { db } from "../db";
import { platformUserRoles } from "../db/schema";
import {
  requireAuth,
  requireOrg,
  requireOrgRole,
  type AppEnv,
} from "../middleware/auth";

// AUTH_PROVIDER=local only (see index.ts's conditional mount).
//
// own-auth's own HTTP handler (own-auth/http) is cookie-oriented - the
// public session it returns never includes the raw session token, only a
// Set-Cookie header - and its organisation methods aren't part of that public
// contract at all (they're server-SDK-only, see own-auth.com/docs/organisations).
// This app's API is bearer-token-only everywhere else (never cookies, see
// CLAUDE.md), so this file calls the OwnAuth engine's direct methods instead
// of mounting that handler, and returns the raw sessionToken the same way
// Neon mode's JWT is returned to the client for it to store and send back as
// `Authorization: Bearer <token>`.
const router = new Hono<AppEnv>();

function authErrorResponse(err: unknown) {
  if (isAuthError(err)) {
    return { message: err.safeMessage, status: err.statusCode as 400 };
  }
  throw err;
}

router.post("/sign-up", async (c) => {
  const { email, password, name } = await c.req.json<{
    email?: string;
    password?: string;
    name?: string;
  }>();
  if (!email || !password) {
    return c.json(
      { success: false, message: "Email and password are required." },
      400,
    );
  }

  try {
    const result = await getOwnAuth().signUpEmailPassword({
      email,
      password,
      name,
    });

    // The first account ever created on a fresh local instance becomes
    // platform admin automatically - otherwise nothing could reach
    // admin-gated routes (Games Manager, sync job, impersonation) without
    // hand-editing platform_user_roles via SQL, and a fresh instance
    // couldn't even add its first game. A second admin still has to be
    // granted manually (see README) - this only ever fires once, for
    // whoever happens to sign up while the table is still empty.
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(platformUserRoles);
    if (Number(count) === 0) {
      await db
        .insert(platformUserRoles)
        .values({ userId: result.user.id, role: "admin" })
        .onConflictDoNothing();
    }

    return c.json({
      success: true,
      data: {
        token: result.sessionToken,
        user: { id: result.user.id, name: result.user.name, email },
      },
    });
  } catch (err) {
    const { message, status } = authErrorResponse(err);
    return c.json({ success: false, message }, status);
  }
});

router.post("/sign-in", async (c) => {
  const { email, password } = await c.req.json<{
    email?: string;
    password?: string;
  }>();
  if (!email || !password) {
    return c.json(
      { success: false, message: "Email and password are required." },
      400,
    );
  }

  try {
    const result = await getOwnAuth().signInEmailPassword({ email, password });
    if (result.status === "mfa_required") {
      return c.json(
        { success: false, message: "Multi-factor accounts aren't supported." },
        400,
      );
    }
    return c.json({
      success: true,
      data: {
        token: result.sessionToken,
        user: { id: result.user.id, name: result.user.name, email },
      },
    });
  } catch (err) {
    const { message, status } = authErrorResponse(err);
    return c.json({ success: false, message }, status);
  }
});

// Deliberately unauthenticated (this is how you recover access when you
// can't sign in at all) and deliberately generic in every response - own-
// auth's requestPasswordReset is already enumeration-safe internally (a
// nonexistent email gets a fabricated token/response with no real email
// sent, so response shape doesn't reveal whether the address exists); this
// route must not undo that by returning anything more specific.
router.post("/forgot-password", async (c) => {
  const { email } = await c.req.json<{ email?: string }>();
  if (email) {
    await getOwnAuth()
      .requestPasswordReset({ email })
      .catch(() => {});
  }
  return c.json({
    success: true,
    message: "If that email has an account, a reset link has been sent.",
  });
});

router.post("/reset-password", async (c) => {
  const { token, newPassword } = await c.req.json<{
    token?: string;
    newPassword?: string;
  }>();
  if (!token || !newPassword) {
    return c.json(
      { success: false, message: "Token and new password are required." },
      400,
    );
  }
  try {
    await getOwnAuth().resetPassword({ token, newPassword });
    return c.json({ success: true, data: null });
  } catch (err) {
    const { message, status } = authErrorResponse(err);
    return c.json({ success: false, message }, status);
  }
});

router.post("/sign-out", async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) await getOwnAuth().signOut(token);
  return c.json({ success: true, data: null });
});

router.get("/session", requireAuth, async (c) => {
  const userId = c.get("userId");
  const [contact, role] = await Promise.all([
    authProvider.getUserContact(userId),
    authProvider.getUserRole(userId),
  ]);
  return c.json({
    success: true,
    data: { id: userId, name: contact.name, email: contact.email, role },
  });
});

router.get("/organizations", requireAuth, async (c) => {
  const orgs = await authProvider.listUserOrganisations(c.get("userId"));
  return c.json({ success: true, data: orgs });
});

router.post("/organizations", requireAuth, async (c) => {
  const { name } = await c.req.json<{ name?: string }>();
  if (!name) {
    return c.json({ success: false, message: "Name is required." }, 400);
  }
  try {
    const { organisation } = await getOwnAuth().createOrganisation({
      name,
      ownerUserId: c.get("userId"),
    });
    return c.json({ success: true, data: organisation });
  } catch (err) {
    const { message, status } = authErrorResponse(err);
    return c.json({ success: false, message }, status);
  }
});

// Called once right after sign-up: a brand-new user has no organisations
// yet, so create one default "Home" org rather than requiring them to
// manually create one before the app is usable. No-op if they already have
// at least one (e.g. this fires again after a later sign-in).
router.post("/bootstrap", requireAuth, async (c) => {
  const userId = c.get("userId");
  const ownAuth = getOwnAuth();
  const existing = await ownAuth.listOrganisations({ actorUserId: userId });
  if (existing.length > 0) {
    return c.json({ success: true, data: existing });
  }

  const { organisation } = await ownAuth.createOrganisation({
    name: "Home",
    ownerUserId: userId,
  });
  return c.json({ success: true, data: [organisation] });
});

// API keys - personal only (never created with an organisationId). An
// org-scoped key has no associated user at all (own-auth sets userId: null
// for those), which doesn't map onto requireAuth/requireOrg's assumption
// that every authenticated request acts as a specific person - rather than
// extend that core model overnight, keys here behave exactly like a normal
// user session (requireOrg's usual org-membership check still applies to
// whatever X-Org-Id the request sends), just longer-lived and scriptable.
router.get("/api-keys", requireAuth, async (c) => {
  const keys = await getOwnAuth().listApiKeys({ actorUserId: c.get("userId") });
  return c.json({ success: true, data: keys });
});

router.post("/api-keys", requireAuth, async (c) => {
  const { name, expiresAt } = await c.req.json<{
    name?: string;
    expiresAt?: string;
  }>();
  if (!name) {
    return c.json({ success: false, message: "Name is required." }, 400);
  }
  try {
    const { apiKey, rawKey } = await getOwnAuth().createApiKey({
      name,
      actorUserId: c.get("userId"),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });
    // rawKey is only ever returned here - own-auth stores just its hash.
    return c.json({ success: true, data: { apiKey, rawKey } });
  } catch (err) {
    const { message, status } = authErrorResponse(err);
    return c.json({ success: false, message }, status);
  }
});

router.delete("/api-keys/:keyPrefix", requireAuth, async (c) => {
  try {
    await getOwnAuth().revokeApiKey({
      keyPrefix: c.req.param("keyPrefix"),
      actorUserId: c.get("userId"),
    });
    return c.json({ success: true, data: null });
  } catch (err) {
    const { message, status } = authErrorResponse(err);
    return c.json({ success: false, message }, status);
  }
});

// Org activity log - owner/admin only (own-auth grants both roles
// view_audit_events by default, checked internally by listAuditEvents
// itself as defense in depth on top of requireOrgRole here).
router.get(
  "/audit-events",
  requireAuth,
  requireOrg,
  requireOrgRole("owner", "admin"),
  async (c) => {
    try {
      const events = await getOwnAuth().listAuditEvents({
        actorUserId: c.get("userId"),
        organisationId: c.get("orgId"),
      });

      const userIds = [
        ...new Set(
          events.flatMap((e) => [e.actorUserId, e.targetUserId]).filter(
            (id): id is string => !!id,
          ),
        ),
      ];
      const contacts = new Map(
        await Promise.all(
          userIds.map(
            async (id) => [id, await authProvider.getUserContact(id)] as const,
          ),
        ),
      );

      const data = events
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((e) => ({
          id: e.id,
          eventType: e.eventType,
          actor: e.actorUserId
            ? (contacts.get(e.actorUserId)?.email ?? e.actorUserId)
            : null,
          target: e.targetUserId
            ? (contacts.get(e.targetUserId)?.email ?? e.targetUserId)
            : null,
          createdAt: e.createdAt,
        }));

      return c.json({ success: true, data });
    } catch (err) {
      const { message, status } = authErrorResponse(err);
      return c.json({ success: false, message }, status);
    }
  },
);

// Org invites - code/link-based rather than requiring a real email provider
// to be configured (see LocalEmailProvider/inviteCaptureStorage for why:
// own-auth's inviteMember() only ever returns the raw token to the caller
// when exposeRawTokens is set, which is blocked in production). The invite
// still goes through own-auth's real inviteMember/acceptInvite flow -
// membership, roles, expiry, and permission checks are all its own, this
// just replaces "email the link" with "hand the admin a link to share".
router.post(
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
      const webUrl = process.env.WEB_URL ?? "http://localhost:5173";
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

router.get(
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

router.delete(
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

// Deliberately requireAuth only, not requireOrg - the invitee doesn't have
// an X-Org-Id for the org they're about to join yet.
router.post("/invites/accept", requireAuth, async (c) => {
  const { token } = await c.req.json<{ token?: string }>();
  if (!token) {
    return c.json({ success: false, message: "Token is required." }, 400);
  }
  try {
    const result = await getOwnAuth().acceptInvite({
      token,
      userId: c.get("userId"),
    });
    return c.json({ success: true, data: result });
  } catch (err) {
    const { message, status } = authErrorResponse(err);
    return c.json({ success: false, message }, status);
  }
});

export const localAuthRouter = router;
