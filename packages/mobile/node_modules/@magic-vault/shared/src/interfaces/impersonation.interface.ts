export interface ImpersonationOrgSummary {
  id: string;
  name: string;
  role: string;
}

export interface AdminUserSummary {
  id: string;
  name: string | null;
  email: string;
  role: string;
  orgs: ImpersonationOrgSummary[];
}

export interface ImpersonationAuditEntry {
  guid: string;
  adminEmail: string | null;
  targetEmail: string | null;
  startedAt: string;
  endedAt: string | null;
}

export interface ImpersonationSession {
  token: string;
  expiresAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  orgs: ImpersonationOrgSummary[];
}
