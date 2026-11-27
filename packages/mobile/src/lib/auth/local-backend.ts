import { API_BASE } from "@/lib/constants/config";
import type { AuthBackend } from "@/lib/interfaces/auth";
import {
  INVALID_CREDENTIALS_ERROR,
  INVALID_CREDENTIALS_HTTP_STATUSES,
  RATE_LIMITED_ERROR,
  RATE_LIMITED_HTTP_STATUS,
  SIGN_IN_FAILED_ERROR,
} from "@/lib/constants/auth";
import type { LocalAuthRequestResult, LocalAuthResponse } from "@/lib/interfaces/api";

async function post(
  path: string,
  body: unknown,
  token?: string,
): Promise<LocalAuthRequestResult> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  return { status: res.status, response: (await res.json()) as LocalAuthResponse };
}

export const localBackend: AuthBackend = {
  async signIn(email, password) {
    try {
      const { status, response } = await post("/api/local-auth/sign-in", { email, password });
      if (response.success && response.data) return { sessionToken: response.data.token };
      if (status === RATE_LIMITED_HTTP_STATUS) return { error: RATE_LIMITED_ERROR };
      return {
        error: INVALID_CREDENTIALS_HTTP_STATUSES.includes(status) ? INVALID_CREDENTIALS_ERROR : SIGN_IN_FAILED_ERROR,
      };
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
