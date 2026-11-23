import type { NeonSocialProvider } from "@magic-vault/shared";
import type { StatusTone } from "@/lib/interfaces/theme";

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

export interface CachedSessionProfile {
  user: SessionUser;
  organizations: UserOrganization[];
}

export interface SignInResult {
  error?: string;
}

export type AuthBackendSignInResult = { sessionToken: string } | { error: string };

export interface AuthBackend {
  signIn(email: string, password: string): Promise<AuthBackendSignInResult>;
  signInWithSocialProvider?(provider: NeonSocialProvider): Promise<AuthBackendSignInResult>;
  accessToken(sessionToken: string): Promise<string | null>;
  signOut(sessionToken: string): Promise<void>;
}

export interface CachedJwt {
  token: string;
  expiresAt: number;
}

export interface StoredAccessToken {
  sessionToken: string;
  jwt: string;
}

export interface AuthSessionRow {
  id: string;
  token: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignInMethodsSectionProps {
  onMessage: (message: { tone: StatusTone; text: string }) => void;
}

export interface DiscordAccountSectionProps {
  onMessage: (message: { tone: StatusTone; text: string }) => void;
}

export interface PendingDiscordLinkCode {
  code: string;
  expiresAt: number;
}
