export interface SessionUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}

export interface UserOrganization {
  id: string;
  name: string;
  role: string;
}

export type SessionStatus = "loading" | "signed-out" | "signed-in";

export interface SessionSnapshot {
  status: SessionStatus;
  user: SessionUser | null;
  organizations: UserOrganization[];
  activeOrgId: string | null;
}

export interface SignInResult {
  error?: string;
}

export interface AuthBackend {
  signIn(email: string, password: string): Promise<{ sessionToken: string } | { error: string }>;
  accessToken(sessionToken: string): Promise<string | null>;
  signOut(sessionToken: string): Promise<void>;
}

export interface CachedJwt {
  token: string;
  expiresAt: number;
}
