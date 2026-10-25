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

  searchUsers(query: string, limit: number): Promise<AdminUserSummary[]>;
  listUserOrganisations(
    userId: string,
  ): Promise<{ id: string; name: string; role: string }[]>;

  getOrganisationName(orgId: string): Promise<string>;
  getOrganisationNames(orgIds: string[]): Promise<Map<string, string>>;

  countUsersAndOrganisations(): Promise<{ users: number; organisations: number }>;
}

export interface InviteCapture {
  token?: string;
  url?: string;
  emailSent?: boolean;
}

export interface ImpersonationPayload {
  sub: string;
  act?: { sub?: string };
}
