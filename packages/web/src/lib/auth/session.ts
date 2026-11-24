import { neon } from "@/lib/auth/client";
import { getLocalToken } from "@/lib/auth/local-token";
import { ACTIVE_ORG_STORAGE_KEY } from "@/lib/constants/storage-keys";
import type { AuthSession } from "@/lib/interfaces/auth";
import { AUTH_PROVIDER, NEON_AUTH_BASE_URL } from "@/lib/constants/auth";
import { jwtExpiresAt } from "@magic-vault/shared";

let neonTokenRefreshedAfterRejection: string | null = null;

function isLaterExpiringToken(candidate: string, current: string | undefined): boolean {
  const candidateExpiresAt = jwtExpiresAt(candidate);
  if (candidateExpiresAt === null || candidateExpiresAt <= Date.now()) return false;
  const currentExpiresAt = current ? jwtExpiresAt(current) : null;
  return currentExpiresAt === null || candidateExpiresAt > currentExpiresAt;
}

export async function getAuthSession(): Promise<AuthSession | null> {
  if (AUTH_PROVIDER === "local") {
    const token = getLocalToken();
    return token ? { token } : null;
  }
  const { data } = await neon.auth.getSession();
  const session = (data as { session?: AuthSession } | null)?.session ?? null;
  if (!session) {
    neonTokenRefreshedAfterRejection = null;
    return null;
  }
  if (
    neonTokenRefreshedAfterRejection &&
    isLaterExpiringToken(neonTokenRefreshedAfterRejection, session.token)
  ) {
    return { ...session, token: neonTokenRefreshedAfterRejection };
  }
  neonTokenRefreshedAfterRejection = null;
  return session;
}

export async function refreshAuthTokenRejectedByApi(
  rejectedToken: string,
): Promise<string | null> {
  if (AUTH_PROVIDER === "local") return null;
  const response = await fetch(`${NEON_AUTH_BASE_URL}/get-session`, {
    credentials: "include",
  }).catch(() => null);
  const refreshedToken = response?.ok ? response.headers.get("set-auth-jwt") : null;
  if (!refreshedToken || refreshedToken === rejectedToken) return null;
  neonTokenRefreshedAfterRejection = refreshedToken;
  return refreshedToken;
}

export function getOrgId(session: AuthSession | null): string | null {
  return localStorage.getItem(ACTIVE_ORG_STORAGE_KEY) ?? session?.activeOrganizationId ?? null;
}
