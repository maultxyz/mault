import type { ImpersonationOrgSummary } from "@magic-vault/shared";

export interface ImpersonationState {
  token: string;
  expiresAt: string;
  user: { id: string; name: string | null; email: string };
  orgs: ImpersonationOrgSummary[];
  activeOrgId: string | null;
}

export interface LocalAuthResult {
  token: string;
  user: { id: string; name: string | null; email: string };
}

export interface LocalSessionUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

export type AuthSession = {
  token?: string;
  activeOrganizationId?: string | null;
};

export interface LocalOrg {
  id: string;
  name: string;
  role: string;
}
