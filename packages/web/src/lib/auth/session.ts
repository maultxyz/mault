import { neon } from "@/lib/auth/client";
import { getLocalToken } from "@/lib/auth/local-token";
import { ACTIVE_ORG_STORAGE_KEY } from "@/lib/constants/storage-keys";
import type { AuthSession } from "@/lib/interfaces/auth";
import { AUTH_PROVIDER } from "@/lib/constants/auth";


export async function getAuthSession(): Promise<AuthSession | null> {
  if (AUTH_PROVIDER === "local") {
    const token = getLocalToken();
    return token ? { token } : null;
  }
  const { data } = await neon.auth.getSession();
  return (data as { session?: AuthSession } | null)?.session ?? null;
}

export function getOrgId(session: AuthSession | null): string | null {
  return localStorage.getItem(ACTIVE_ORG_STORAGE_KEY) ?? session?.activeOrganizationId ?? null;
}
