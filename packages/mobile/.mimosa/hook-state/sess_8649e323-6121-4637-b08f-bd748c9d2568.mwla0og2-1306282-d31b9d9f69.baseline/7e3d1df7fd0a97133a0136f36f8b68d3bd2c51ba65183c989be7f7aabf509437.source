import { queryOptions } from "@tanstack/react-query";
import { neonAuthRequest } from "@/lib/auth/neon-backend";
import { getSessionToken } from "@/lib/auth/session";
import type { AuthSessionRow } from "@/lib/interfaces/auth";

function token(): string {
  const value = getSessionToken();
  if (!value) throw new Error("Not signed in.");
  return value;
}

export const authSessionsQueryOptions = () =>
  queryOptions({
    queryKey: ["auth-sessions"] as const,
    queryFn: async () => {
      const rows = await neonAuthRequest<AuthSessionRow[] | null>("/list-sessions", token());
      return [...(rows ?? [])].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    },
  });

export async function updateName(name: string): Promise<void> {
  await neonAuthRequest("/update-user", token(), { name });
}

export async function changeEmail(newEmail: string): Promise<void> {
  await neonAuthRequest("/change-email", token(), { newEmail });
}

export async function changePassword(currentPassword: string, newPassword: string, revokeOtherSessions: boolean) {
  await neonAuthRequest("/change-password", token(), { currentPassword, newPassword, revokeOtherSessions });
}

export async function revokeAuthSession(sessionToken: string): Promise<void> {
  await neonAuthRequest("/revoke-session", token(), { token: sessionToken });
}

export async function revokeOtherAuthSessions(): Promise<void> {
  await neonAuthRequest("/revoke-other-sessions", token(), {});
}
