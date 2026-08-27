import { createMiddleware } from "hono/factory";
import * as jose from "jose";
import { authProvider } from "../auth";
import type { OrgRole } from "../auth/types";

export type { OrgRole };

export type AppVariables = {
  jwtClaims: string;
  userId: string;
  userRole: string;
  orgId: string;
  orgRole: OrgRole;
  impersonatedBy: string | null;
};
export type AppEnv = { Variables: AppVariables };

// Delegates to whichever AuthProvider is active (see ../auth/index.ts) - the
// active provider owns verifying a raw bearer token into a user id, but the
// jwtClaims shape Postgres RLS policies read via request.jwt.claims is the
// same regardless of provider, so it's synthesized here rather than by each
// provider.
export async function verifyToken(
  token: string,
): Promise<{ sub: string } | null> {
  return authProvider.verifyToken(token);
}

export const IMPERSONATION_ISSUER = "magic-vault-impersonation";
export const IMPERSONATION_TTL_SECONDS = 60 * 60;

function impersonationSecret(): Uint8Array {
  const secret = process.env.IMPERSONATION_SECRET;
  if (!secret) {
    throw new Error("IMPERSONATION_SECRET is not configured.");
  }
  return new TextEncoder().encode(secret);
}

// Impersonation is the app's own HS256 token scheme, independent of
// AUTH_PROVIDER - it works identically against either identity backend.
export async function signImpersonationToken(
  adminUserId: string,
  targetUserId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + IMPERSONATION_TTL_SECONDS * 1000);
  const token = await new jose.SignJWT({ act: { sub: adminUserId } })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(IMPERSONATION_ISSUER)
    .setSubject(targetUserId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(impersonationSecret());
  return { token, expiresAt };
}

interface ImpersonationPayload {
  sub: string;
  act?: { sub?: string };
}

async function verifyImpersonationToken(
  token: string,
): Promise<ImpersonationPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, impersonationSecret(), {
      issuer: IMPERSONATION_ISSUER,
    });
    if (!payload.sub) return null;
    return payload as ImpersonationPayload;
  } catch {
    return null;
  }
}

export async function getUserRole(userId: string): Promise<string> {
  return authProvider.getUserRole(userId);
}

export async function getUserContact(
  userId: string,
): Promise<{ name: string | null; email: string | null }> {
  return authProvider.getUserContact(userId);
}

export async function getUserDisplayName(userId: string): Promise<string> {
  return authProvider.getUserDisplayName(userId);
}

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }
  const token = authHeader.slice(7);

  const impersonation = await verifyImpersonationToken(token);
  if (impersonation) {
    const role = await getUserRole(impersonation.sub);
    c.set(
      "jwtClaims",
      JSON.stringify({ sub: impersonation.sub, role: "authenticated" }),
    );
    c.set("userId", impersonation.sub);
    c.set("userRole", role);
    c.set("impersonatedBy", impersonation.act?.sub ?? null);
    await next();
    return;
  }

  const payload = await verifyToken(token);
  if (!payload?.sub)
    return c.json({ success: false, message: "Unauthorized" }, 401);
  const role = await getUserRole(payload.sub);
  c.set(
    "jwtClaims",
    JSON.stringify({ sub: payload.sub, role: "authenticated" }),
  );
  c.set("userId", payload.sub);
  c.set("userRole", role);
  c.set("impersonatedBy", null);
  await next();
});

export const requireOrg = createMiddleware<AppEnv>(async (c, next) => {
  const orgId = c.req.header("X-Org-Id");
  if (!orgId) {
    return c.json(
      { success: false, message: "Organization context required." },
      400,
    );
  }

  const userId = c.get("userId");
  const member = await authProvider.resolveOrgMembership(userId, orgId);

  if (!member) {
    return c.json(
      { success: false, message: "Organization not found or access denied." },
      403,
    );
  }

  c.set("orgId", orgId);
  c.set("orgRole", member.role);
  c.set(
    "jwtClaims",
    JSON.stringify({ sub: userId, role: "authenticated", org_id: orgId }),
  );
  await next();
});

export function requireRole(...roles: string[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!roles.includes(c.get("userRole"))) {
      return c.json({ success: false, message: "Forbidden" }, 403);
    }
    await next();
  });
}

export function requireOrgRole(...roles: OrgRole[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!roles.includes(c.get("orgRole"))) {
      return c.json(
        { success: false, message: "Insufficient organization permissions." },
        403,
      );
    }
    await next();
  });
}

export const requireBotSecret = createMiddleware<AppEnv>(async (c, next) => {
  const secret = c.req.header("X-Bot-Secret");
  if (
    !secret ||
    !process.env.BOT_API_SECRET ||
    secret !== process.env.BOT_API_SECRET
  ) {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }
  await next();
});
