import type { AdminUserSummary } from "@magic-vault/shared";

export type OrgRole = "owner" | "admin" | "member";

// One implementation per AUTH_PROVIDER value (see ./neon.ts, ./local.ts,
// ./index.ts). middleware/auth.ts's requireAuth/requireOrg call into these
// instead of hardcoding a specific identity backend, so every route stays
// unchanged regardless of which provider is active - jwtClaims synthesis
// (the shape Postgres RLS policies read via request.jwt.claims) stays in
// middleware/auth.ts itself since it's identical for every provider.
export interface AuthProvider {
  verifyToken(token: string): Promise<{ sub: string } | null>;
  getUserRole(userId: string): Promise<string>;
  resolveOrgMembership(
    userId: string,
    orgId: string,
  ): Promise<{ role: OrgRole } | null>;
  getUserContact(
    userId: string,
  ): Promise<{ name: string | null; email: string | null }>;
  getUserDisplayName(userId: string): Promise<string>;

  // Admin-only (routes/impersonation.ts): find impersonation targets and
  // list a target user's org memberships before minting an impersonation
  // token for them.
  searchUsers(query: string, limit: number): Promise<AdminUserSummary[]>;
  listUserOrganisations(
    userId: string,
  ): Promise<{ id: string; name: string; role: string }[]>;

  // routes/bot.ts (Discord integration) - resolves an org id to its display
  // name, bypassing RLS via `db` directly the same way the rest of that
  // route does (the bot has no per-user session/claims to scope a query to).
  getOrganisationName(orgId: string): Promise<string>;
}
