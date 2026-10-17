import { NEON_AUTH_URL, WEB_URL } from "@/lib/constants/config";
import type { AuthBackend } from "@/lib/interfaces/auth";

function neonHeaders(sessionToken?: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Origin: WEB_URL,
    ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
  };
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string };
    return body.message ?? fallback;
  } catch {
    return fallback;
  }
}

async function sessionFrom(
  res: Response,
  fallback: string,
): Promise<{ sessionToken: string } | { error: string }> {
  if (!res.ok) return { error: await readError(res, fallback) };
  const headerToken = res.headers.get("set-auth-token");
  const body = (await res.json().catch(() => null)) as { token?: string | null } | null;
  const sessionToken = headerToken ?? body?.token ?? null;
  return sessionToken ? { sessionToken } : { error: "verify-email" };
}

export const neonBackend: AuthBackend = {
  async signIn(email, password) {
    try {
      const res = await fetch(`${NEON_AUTH_URL}/sign-in/email`, {
        method: "POST",
        headers: neonHeaders(),
        body: JSON.stringify({ email, password }),
      });
      return await sessionFrom(res, "Sign in failed.");
    } catch {
      return { error: "network" };
    }
  },

  async accessToken(sessionToken) {
    try {
      const res = await fetch(`${NEON_AUTH_URL}/token`, {
        headers: neonHeaders(sessionToken),
      });
      if (res.ok) {
        const body = (await res.json()) as { token?: string };
        if (body.token) return body.token;
      }
      if (res.status === 401) return null;
      const session = await fetch(`${NEON_AUTH_URL}/get-session`, {
        headers: neonHeaders(sessionToken),
      });
      return session.headers.get("set-auth-jwt");
    } catch {
      return null;
    }
  },

  async signOut(sessionToken) {
    await fetch(`${NEON_AUTH_URL}/sign-out`, {
      method: "POST",
      headers: neonHeaders(sessionToken),
    }).catch(() => {});
  },
};

export async function neonAuthRequest<T>(path: string, sessionToken: string, body?: unknown): Promise<T> {
  const res = await fetch(`${NEON_AUTH_URL}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: neonHeaders(sessionToken),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res, "Request failed."));
  return (await res.json()) as T;
}
