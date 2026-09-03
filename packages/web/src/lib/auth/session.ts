import { neon } from "@/lib/auth/client";
import { getLocalToken } from "@/lib/auth/local-token";
import { AUTH_PROVIDER } from "@/lib/auth/provider";

export type AuthSession = {
  token?: string;
  activeOrganizationId?: string | null;
};

export async function getAuthSession(): Promise<AuthSession | null> {
  if (AUTH_PROVIDER === "local") {
    const token = getLocalToken();
    return token ? { token } : null;
  }
  const { data } = await neon.auth.getSession();
  return (data as { session?: AuthSession } | null)?.session ?? null;
}

export function getOrgId(session: AuthSession | null): string | null {
  // localStorage is the source of truth: the Neon Auth client caches getSession()
  // responses in memory and only busts that cache on sign-out/updateUser, never on
  // organization.setActive — so session.activeOrganizationId can lag behind an org
  // switch for the life of the cached JWT. setActiveOrg() writes localStorage
  // synchronously on every switch, so prefer it over the potentially-stale session.
  return localStorage.getItem("activeOrgId") ?? session?.activeOrganizationId ?? null;
}
