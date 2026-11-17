import type { AdminUserSummary, OrgRole } from "@magic-vault/shared";
import { eq, sql } from "drizzle-orm";
import { isAuthError } from "own-auth";
import { db } from "../db";
import { platformUserRoles } from "../db/schema";
import { getOwnAuth } from "./own-auth-instance";
import type { AuthProvider } from "../lib/interfaces/auth";

export const localAuthProvider: AuthProvider = {
  async verifyToken(token) {
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
    } catch (error) {
      if (isAuthError(error)) return null;
      throw error;
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
              OR EXISTS (
                SELECT 1
                FROM own_auth_organisation_members om
                JOIN own_auth_organisations oo ON oo.id = om.organisation_id
                WHERE om.user_id = u.id
                  AND om.status = 'active'
                  AND oo.name ILIKE ${pattern}
              )
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

  async listOrgMemberUserIdsBySeat(orgId) {
    const rows = await db.execute<{ user_id: string }>(
      sql`
        SELECT user_id::text AS user_id
        FROM own_auth_organisation_members
        WHERE organisation_id::text = ${orgId} AND status = 'active'
        ORDER BY (role = 'owner') DESC, created_at, id
      `,
    );
    return rows.rows.map((row) => row.user_id);
  },

  async getOrganisationName(orgId) {
    const rows = await db.execute<{ name: string }>(
      sql`SELECT name FROM own_auth_organisations WHERE id = ${orgId} LIMIT 1`,
    );
    return rows.rows[0]?.name ?? "your organization";
  },

  async getOrganisationNames(orgIds) {
    if (orgIds.length === 0) return new Map();
    const rows = await db.execute<{ id: string; name: string }>(
      sql`SELECT id::text AS id, name FROM own_auth_organisations WHERE id::text IN (${sql.join(
        orgIds.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    );
    return new Map(rows.rows.map((row) => [row.id, row.name]));
  },

  async countUsersAndOrganisations() {
    const rows = await db.execute<{ users: number; organisations: number }>(
      sql`SELECT
        (SELECT count(*)::int FROM own_auth_users) AS users,
        (SELECT count(*)::int FROM own_auth_organisations) AS organisations`,
    );
    return {
      users: rows.rows[0]?.users ?? 0,
      organisations: rows.rows[0]?.organisations ?? 0,
    };
  },
};
