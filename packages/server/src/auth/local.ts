import type { AdminUserSummary } from "@magic-vault/shared";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { platformUserRoles } from "../db/schema";
import { getOwnAuth } from "./own-auth-instance";
import type { AuthProvider, OrgRole } from "./types";

export const localAuthProvider: AuthProvider = {
  async verifyToken(token) {
    // API keys are personal-only here (see routes/local-auth.ts) - always
    // created without an organisationId, so VerifiedApiKey.user is always
    // populated and this maps onto the same {sub} shape a session does, no
    // special-casing needed downstream (requireOrg's normal membership
    // check still applies for whatever X-Org-Id the request sends).
    if (token.startsWith("oa_")) {
      try {
        const verified = await getOwnAuth().verifyApiKey(token);
        return verified.user ? { sub: verified.user.id } : null;
      } catch {
        return null;
      }
    }
    const session = await getOwnAuth().getCurrentSession(token);
    return session ? { sub: session.user.id } : null;
  },

  async getUserRole(userId) {
    const [row] = await db
      .select({ role: platformUserRoles.role })
      .from(platformUserRoles)
      .where(eq(platformUserRoles.userId, userId))
      .limit(1);
    return row?.role ?? "user";
  },

  async resolveOrgMembership(userId, orgId) {
    try {
      const member = await getOwnAuth().getMember({
        organisationId: orgId,
        userId,
        actorUserId: userId,
      });
      if (member.status !== "active") return null;
      return { role: member.role as OrgRole };
    } catch {
      return null;
    }
  },

  async getUserContact(userId) {
    try {
      const result = await db.execute<{
        name: string | null;
        email: string | null;
      }>(sql`SELECT name, email FROM own_auth_users WHERE id = ${userId} LIMIT 1`);
      return result.rows[0] ?? { name: null, email: null };
    } catch {
      return { name: null, email: null };
    }
  },

  async getUserDisplayName(userId) {
    try {
      const result = await db.execute<{
        name: string | null;
        email: string | null;
      }>(sql`SELECT name, email FROM own_auth_users WHERE id = ${userId} LIMIT 1`);
      const row = result.rows[0];
      return row?.name ?? row?.email?.split("@")[0] ?? "Unknown";
    } catch {
      return "Unknown";
    }
  },

  async searchUsers(query, limit) {
    const pattern = `%${query}%`;
    const rows = await db.execute<{
      id: string;
      name: string | null;
      email: string;
      role: string;
      orgs: AdminUserSummary["orgs"];
    }>(
      query
        ? sql`
            SELECT u.id, u.name, u.email, COALESCE(r.role, 'user') AS role,
              COALESCE(
                json_agg(json_build_object('id', o.id, 'name', o.name, 'role', m.role))
                  FILTER (WHERE o.id IS NOT NULL),
                '[]'
              ) AS orgs
            FROM own_auth_users u
            LEFT JOIN platform_user_roles r ON r.user_id = u.id
            LEFT JOIN own_auth_organisation_members m
              ON m.user_id = u.id AND m.status = 'active'
            LEFT JOIN own_auth_organisations o ON o.id = m.organisation_id
            WHERE u.name ILIKE ${pattern} OR u.email ILIKE ${pattern}
            GROUP BY u.id, u.name, u.email, r.role
            ORDER BY u.email
            LIMIT ${limit}
          `
        : sql`
            SELECT u.id, u.name, u.email, COALESCE(r.role, 'user') AS role,
              COALESCE(
                json_agg(json_build_object('id', o.id, 'name', o.name, 'role', m.role))
                  FILTER (WHERE o.id IS NOT NULL),
                '[]'
              ) AS orgs
            FROM own_auth_users u
            LEFT JOIN platform_user_roles r ON r.user_id = u.id
            LEFT JOIN own_auth_organisation_members m
              ON m.user_id = u.id AND m.status = 'active'
            LEFT JOIN own_auth_organisations o ON o.id = m.organisation_id
            GROUP BY u.id, u.name, u.email, r.role
            ORDER BY u.email
            LIMIT ${limit}
          `,
    );
    return rows.rows;
  },

  async listUserOrganisations(userId) {
    const rows = await db.execute<{ id: string; name: string; role: string }>(
      sql`
        SELECT o.id, o.name, m.role
        FROM own_auth_organisation_members m
        JOIN own_auth_organisations o ON o.id = m.organisation_id
        WHERE m.user_id = ${userId} AND m.status = 'active'
        ORDER BY o.name
      `,
    );
    return rows.rows;
  },

  async getOrganisationName(orgId) {
    const rows = await db.execute<{ name: string }>(
      sql`SELECT name FROM own_auth_organisations WHERE id = ${orgId} LIMIT 1`,
    );
    return rows.rows[0]?.name ?? "your organization";
  },
};
