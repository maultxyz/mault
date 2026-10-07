import type { AdminUserSummary, OrgRole } from "@magic-vault/shared";

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

  countUsersAndOrganisations(): Promise<{ users: number; organisations: number }>;
}

export interface InviteCapture {
  token?: string;
  url?: string;
  // Whether LocalEmailProvider also got a real email out via Resend (as
  // opposed to just capturing the link above) - lets the /invites route
  // tell the admin accurately whether the invitee will also get an email,
  // or whether sharing this link is the only way they'll find out.
  emailSent?: boolean;
}

export interface ImpersonationPayload {
  sub: string;
  act?: { sub?: string };
}
