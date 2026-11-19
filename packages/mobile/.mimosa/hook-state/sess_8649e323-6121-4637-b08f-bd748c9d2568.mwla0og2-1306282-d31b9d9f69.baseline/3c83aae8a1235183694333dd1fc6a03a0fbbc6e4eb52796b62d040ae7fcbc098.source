import { API_BASE } from "@/lib/constants/config";
import type { AuthBackend } from "@/lib/interfaces/auth";
import type { LocalAuthResponse } from "@/lib/interfaces/api";

async function post(
  path: string,
  body: unknown,
  token?: string,
): Promise<LocalAuthResponse> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  return (await res.json()) as LocalAuthResponse;
}

export const localBackend: AuthBackend = {
  async signIn(email, password) {
    try {
      const res = await post("/api/local-auth/sign-in", { email, password });
      if (!res.success || !res.data) return { error: res.message ?? "Sign in failed." };
      return { sessionToken: res.data.token };
    } catch {
      return { error: "network" };
    }
  },

  async accessToken(sessionToken) {
    return sessionToken;
  },

  async signOut(sessionToken) {
    await post("/api/local-auth/sign-out", {}, sessionToken).catch(() => {});
  },
};
