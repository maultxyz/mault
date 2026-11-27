import {
  MOBILE_SOCIAL_SIGN_IN_APP_CALLBACK_URL,
  MOBILE_SOCIAL_SIGN_IN_CALLBACK_PATH,
  MOBILE_SOCIAL_SIGN_IN_ERROR_PARAM,
  MOBILE_SOCIAL_SIGN_IN_START_PATH,
  MOBILE_SOCIAL_SIGN_IN_START_TOKEN_PARAM,
  NEON_AUTH_SESSION_VERIFIER_PARAM,
  type NeonSocialProvider,
} from "@magic-vault/shared";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import {
  INVALID_CREDENTIALS_ERROR,
  INVALID_CREDENTIALS_HTTP_STATUSES,
  NEON_EMAIL_NOT_VERIFIED_ERROR_CODE,
  RATE_LIMITED_ERROR,
  RATE_LIMITED_HTTP_STATUS,
  SIGN_IN_FAILED_ERROR,
  NEON_AUTH_SESSION_CHALLENGE_COOKIE_PATTERN,
  NEON_AUTH_SESSION_TOKEN_COOKIE_NAME,
  NEON_AUTH_SESSION_TOKEN_COOKIE_PATTERN,
  SOCIAL_SIGN_IN_CANCELLED_ERROR,
} from "@/lib/constants/auth";
import { NeonAuthRequestError } from "@/lib/auth/neon-auth-request-error";
import { NEON_AUTH_URL, WEB_URL } from "@/lib/constants/config";
import type { AuthBackend, AuthBackendSignInResult } from "@/lib/interfaces/auth";

function sessionTokenCookieValue(sessionToken: string): string {
  return sessionToken.includes("%") ? sessionToken : encodeURIComponent(sessionToken);
}

function neonHeaders(sessionToken?: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Origin: WEB_URL,
    ...(sessionToken
      ? { Cookie: `${NEON_AUTH_SESSION_TOKEN_COOKIE_NAME}=${sessionTokenCookieValue(sessionToken)}` }
      : {}),
  };
}

async function signInErrorFrom(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { code?: string } | null;
  if (body?.code === NEON_EMAIL_NOT_VERIFIED_ERROR_CODE) return "verify-email";
  if (res.status === RATE_LIMITED_HTTP_STATUS) return RATE_LIMITED_ERROR;
  return INVALID_CREDENTIALS_HTTP_STATUSES.includes(res.status) ? INVALID_CREDENTIALS_ERROR : SIGN_IN_FAILED_ERROR;
}

async function sessionFrom(res: Response): Promise<AuthBackendSignInResult> {
  if (!res.ok) return { error: await signInErrorFrom(res) };
  const headerToken =
    res.headers.get("set-cookie")?.match(NEON_AUTH_SESSION_TOKEN_COOKIE_PATTERN)?.[1] ??
    res.headers.get("set-auth-token") ??
    null;
  const body = (await res.json().catch(() => null)) as {
    token?: string | null;
    session?: { token?: string | null } | null;
  } | null;
  const sessionToken = headerToken ?? body?.token ?? body?.session?.token ?? null;
  return sessionToken ? { sessionToken } : { error: "verify-email" };
}

async function readNeonErrorCode(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { code?: string; message?: string };
    return body.code ?? body.message ?? `${fallback}-${res.status}`;
  } catch {
    return `${fallback}-${res.status}`;
  }
}

function sessionChallengeCookieFrom(res: Response): string | null {
  const cookies = res.headers.get("set-cookie")?.match(NEON_AUTH_SESSION_CHALLENGE_COOKIE_PATTERN);
  return cookies?.length ? cookies.join("; ") : null;
}

function readQueryParam(url: string, name: string): string | null {
  const value = Linking.parse(url).queryParams?.[name];
  return typeof value === "string" && value ? value : null;
}

function mobileSignInStartUrl(providerSignInUrl: string): string {
  const token = readQueryParam(providerSignInUrl, MOBILE_SOCIAL_SIGN_IN_START_TOKEN_PARAM);
  if (!token) return providerSignInUrl;
  const query = new URLSearchParams({ [MOBILE_SOCIAL_SIGN_IN_START_TOKEN_PARAM]: token });
  return `${WEB_URL}${MOBILE_SOCIAL_SIGN_IN_START_PATH}?${query}`;
}

async function signInWithSocialProvider(provider: NeonSocialProvider): Promise<AuthBackendSignInResult> {
  const startResponse = await fetch(`${NEON_AUTH_URL}/sign-in/social`, {
    method: "POST",
    credentials: "omit",
    headers: neonHeaders(),
    body: JSON.stringify({
      provider,
      callbackURL: `${WEB_URL}${MOBILE_SOCIAL_SIGN_IN_CALLBACK_PATH}`,
      disableRedirect: true,
    }),
  });
  if (!startResponse.ok) return { error: await readNeonErrorCode(startResponse, "social-start") };
  const sessionChallengeCookie = sessionChallengeCookieFrom(startResponse);
  if (!sessionChallengeCookie) return { error: "social-no-challenge-cookie" };
  const { url: providerSignInUrl } = (await startResponse.json()) as { url?: string };
  if (!providerSignInUrl) return { error: "social" };

  const browserResult = await WebBrowser.openAuthSessionAsync(
    mobileSignInStartUrl(providerSignInUrl),
    MOBILE_SOCIAL_SIGN_IN_APP_CALLBACK_URL,
  );
  if (browserResult.type !== "success") return { error: SOCIAL_SIGN_IN_CANCELLED_ERROR };
  const sessionVerifier = readQueryParam(browserResult.url, NEON_AUTH_SESSION_VERIFIER_PARAM);
  if (!sessionVerifier) {
    return {
      error: readQueryParam(browserResult.url, MOBILE_SOCIAL_SIGN_IN_ERROR_PARAM) ?? "social-no-verifier",
    };
  }

  const sessionResponse = await fetch(
    `${NEON_AUTH_URL}/get-session?${NEON_AUTH_SESSION_VERIFIER_PARAM}=${encodeURIComponent(sessionVerifier)}`,
    {
      credentials: "omit",
      headers: { ...neonHeaders(), Cookie: sessionChallengeCookie },
    },
  );
  if (!sessionResponse.ok) {
    return { error: await readNeonErrorCode(sessionResponse, "social-session") };
  }
  const sessionTokenCandidates = await sessionTokenCandidatesFrom(sessionResponse);
  if (sessionTokenCandidates.length === 0) return { error: "social-no-session" };
  for (const sessionTokenCandidate of sessionTokenCandidates) {
    if (await accessTokenFor(sessionTokenCandidate)) return { sessionToken: sessionTokenCandidate };
  }
  return { error: "social-session-rejected" };
}

async function sessionTokenCandidatesFrom(res: Response): Promise<string[]> {
  const cookieToken = res.headers.get("set-cookie")?.match(NEON_AUTH_SESSION_TOKEN_COOKIE_PATTERN)?.[1] ?? null;
  const body = (await res.json().catch(() => null)) as {
    token?: string | null;
    session?: { token?: string | null } | null;
  } | null;
  const candidates = [cookieToken, res.headers.get("set-auth-token"), body?.token, body?.session?.token];
  return [...new Set(candidates.filter((candidate): candidate is string => Boolean(candidate)))];
}

async function accessTokenFor(sessionToken: string): Promise<string | null> {
  const tokenResponse = await fetch(`${NEON_AUTH_URL}/token`, {
    credentials: "omit",
    headers: neonHeaders(sessionToken),
  });
  if (tokenResponse.ok) {
    const body = (await tokenResponse.json()) as { token?: string };
    if (body.token) return body.token;
  }
  if (tokenResponse.status === 401) return null;
  const sessionResponse = await fetch(`${NEON_AUTH_URL}/get-session`, {
    credentials: "omit",
    headers: neonHeaders(sessionToken),
  });
  if (sessionResponse.status === 401) return null;
  if (!sessionResponse.ok) {
    throw new Error(`Session refresh failed (${sessionResponse.status})`);
  }
  return sessionResponse.headers.get("set-auth-jwt");
}

export const neonBackend: AuthBackend = {
  async signIn(email, password) {
    try {
      const res = await fetch(`${NEON_AUTH_URL}/sign-in/email`, {
        method: "POST",
        credentials: "omit",
        headers: neonHeaders(),
        body: JSON.stringify({ email, password }),
      });
      return await sessionFrom(res);
    } catch {
      return { error: "network" };
    }
  },

  async signInWithSocialProvider(provider) {
    try {
      return await signInWithSocialProvider(provider);
    } catch {
      return { error: "network" };
    }
  },

  accessToken: accessTokenFor,

  async signOut(sessionToken) {
    await fetch(`${NEON_AUTH_URL}/sign-out`, {
      method: "POST",
      credentials: "omit",
      headers: neonHeaders(sessionToken),
    }).catch(() => {});
  },
};

export async function neonAuthRequest<T>(path: string, sessionToken: string, body?: unknown): Promise<T> {
  const res = await fetch(`${NEON_AUTH_URL}${path}`, {
    credentials: "omit",
    method: body === undefined ? "GET" : "POST",
    headers: neonHeaders(sessionToken),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const errorBody = (await res.json().catch(() => null)) as { code?: string; message?: string } | null;
    throw new NeonAuthRequestError(errorBody?.message ?? "Request failed.", errorBody?.code ?? null);
  }
  return (await res.json()) as T;
}
