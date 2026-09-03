import type { AdminUserSummary } from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import * as jose from "jose";
import { db } from "../db";
import type { AuthProvider, OrgRole } from "./types";

// Lazy: auth/index.ts imports both providers unconditionally regardless of
// AUTH_PROVIDER, so this can't construct a URL from NEON_AUTH_URL at module
// load - that env var is unset (and irrelevant) in local-mode deployments.
let jwks: ReturnType<typeof jose.createRemoteJWKSet> | undefined;
function getJwks() {
  if (!jwks) {
    jwks = jose.createRemoteJWKSet(
      new URL(`${process.env.NEON_AUTH_URL}/.well-known/jwks.json`),
    );
  }
  return jwks;
}

export const neonAuthProvider: AuthProvider = {
  async verifyToken(token) {
    try {
      const { payload } = await jose.jwtVerify(token, getJwks(), {
        issuer: new URL(process.env.NEON_AUTH_URL!).origin,
      });
      return payload.sub ? { sub: payload.sub } : null;
    } catch {
      return null;
    }
  },

  async getUserRole(userId) {
    try {
      const result = await db.execute(
        sql`SELECT role FROM neon_auth.user WHERE id = ${userId} LIMIT 1`,
      );
      return (result.rows[0]?.role as string) ?? "user";
    } catch {
      return "user";
    }
  },

  async resolveOrgMembership(userId, orgId) {
    const rows = await db.execute<{ role: string }>(
      sql`SELECT role FROM neon_auth.member WHERE "organizationId" = ${orgId} AND "userId" = ${userId} LIMIT 1`,
    );
    const member = rows.rows[0];
    return member ? { role: member.role as OrgRole } : null;
  },

  async getUserContact(userId) {
    try {
      const result = await db.execute<{
        name: string | null;
        email: string | null;
      }>(
        sql`SELECT name, email FROM neon_auth.user WHERE id = ${userId} LIMIT 1`,
      );
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
      }>(
        sql`SELECT name, email FROM neon_auth.user WHERE id = ${userId} LIMIT 1`,
      );
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
            SELECT u.id, u.name, u.email, u.role,
              COALESCE(
                json_agg(json_build_object('id', o.id, 'name', o.name, 'role', m.role))
                  FILTER (WHERE o.id IS NOT NULL),
                '[]'
              ) AS orgs
            FROM neon_auth.user u
            LEFT JOIN neon_auth.member m ON m."userId" = u.id
            LEFT JOIN neon_auth.organization o ON o.id = m."organizationId"
            WHERE u.name ILIKE ${pattern} OR u.email ILIKE ${pattern}
            GROUP BY u.id, u.name, u.email, u.role
            ORDER BY u.email
            LIMIT ${limit}
          `
        : sql`
            SELECT u.id, u.name, u.email, u.role,
              COALESCE(
                json_agg(json_build_object('id', o.id, 'name', o.name, 'role', m.role))
                  FILTER (WHERE o.id IS NOT NULL),
                '[]'
              ) AS orgs
            FROM neon_auth.user u
            LEFT JOIN neon_auth.member m ON m."userId" = u.id
            LEFT JOIN neon_auth.organization o ON o.id = m."organizationId"
            GROUP BY u.id, u.name, u.email, u.role
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
        FROM neon_auth.member m
        JOIN neon_auth.organization o ON o.id = m."organizationId"
        WHERE m."userId" = ${userId}
        ORDER BY o.name
      `,
    );
    return rows.rows;
  },

  async getOrganisationName(orgId) {
    const rows = await db.execute<{ name: string }>(
      sql`SELECT name FROM neon_auth.organization WHERE id = ${orgId} LIMIT 1`,
    );
    return rows.rows[0]?.name ?? "your organization";
  },
};
