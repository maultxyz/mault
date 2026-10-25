import { useSyncExternalStore } from "react";
import { localBackend } from "@/lib/auth/local-backend";
import { neonBackend } from "@/lib/auth/neon-backend";
import { jwtExpiresAt } from "@/lib/auth/jwt";
import {
  JWT_REFRESH_MARGIN_MS,
  SESSION_RESTORE_RETRY_MAX_MS,
  SESSION_RESTORE_RETRY_MIN_MS,
} from "@/lib/constants/auth";
import { API_BASE, AUTH_PROVIDER } from "@/lib/constants/config";
import { ACTIVE_ORG_KEY, SESSION_TOKEN_KEY } from "@/lib/constants/storage-keys";
import type {
  CachedJwt,
  SessionSnapshot,
  SessionUser,
  SignInResult,
  UserOrganization,
} from "@/lib/interfaces/auth";
import type { Result } from "@magic-vault/shared";
import { readKv, writeKv } from "@/lib/storage/kv";
import { delay } from "@/lib/delay";
import { readSecure, writeSecure } from "@/lib/storage/secure";

const backend = AUTH_PROVIDER === "local" ? localBackend : neonBackend;

let snapshot: SessionSnapshot = {
  status: "loading",
  user: null,
  organizations: [],
  activeOrgId: readKv(ACTIVE_ORG_KEY),
};
let sessionToken: string | null = null;
let cachedJwt: CachedJwt | null = null;
let pendingJwt: Promise<string | null> | null = null;
const listeners = new Set<() => void>();

function setSnapshot(next: Partial<SessionSnapshot>): void {
  snapshot = { ...snapshot, ...next };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSessionSnapshot(): SessionSnapshot {
  return snapshot;
}

export function useSession(): SessionSnapshot {
  return useSyncExternalStore(subscribe, getSessionSnapshot);
}

export async function getAccessToken(): Promise<string | null> {
  if (!sessionToken) return null;
  if (cachedJwt && cachedJwt.expiresAt - JWT_REFRESH_MARGIN_MS > Date.now()) {
    return cachedJwt.token;
  }
  if (!pendingJwt) {
    const token = sessionToken;
    pendingJwt = backend
      .accessToken(token)
      .then((jwt) => {
        cachedJwt = jwt
          ? { token: jwt, expiresAt: jwtExpiresAt(jwt) ?? Date.now() + JWT_REFRESH_MARGIN_MS * 2 }
          : null;
        return jwt;
      })
      .finally(() => {
        pendingJwt = null;
      });
  }
  return pendingJwt;
}

export function getSessionToken(): string | null {
  return sessionToken;
}

export function getActiveOrgId(): string | null {
  return snapshot.activeOrgId;
}

async function fetchMe<T>(path: string, token: string): Promise<T | null> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`${path} failed (${response.status})`);
  const body = (await response.json()) as Result<T>;
  return body.success ? (body.data ?? null) : null;
}

function pickActiveOrg(orgs: UserOrganization[]): string | null {
  const stored = snapshot.activeOrgId;
  if (stored && orgs.some((org) => org.id === stored)) return stored;
  return orgs[0]?.id ?? null;
}

async function loadProfile(): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;
  const [user, organizations] = await Promise.all([
    fetchMe<SessionUser>("/api/me", token),
    fetchMe<UserOrganization[]>("/api/me/organizations", token),
  ]);
  if (!user) return false;
  const orgs = organizations ?? [];
  const activeOrgId = pickActiveOrg(orgs);
  writeKv(ACTIVE_ORG_KEY, activeOrgId);
  setSnapshot({ status: "signed-in", user, organizations: orgs, activeOrgId });
  return true;
}

function clearLocalSession(): void {
  sessionToken = null;
  cachedJwt = null;
  void writeSecure(SESSION_TOKEN_KEY, null).catch((error: unknown) =>
    console.warn("Clearing the stored session failed", error),
  );
  setSnapshot({ status: "signed-out", user: null, organizations: [] });
}

export async function restoreSession(): Promise<void> {
  sessionToken = await readSecure(SESSION_TOKEN_KEY);
  if (!sessionToken) {
    setSnapshot({ status: "signed-out" });
    return;
  }
  for (let attempt = 0; ; attempt++) {
    try {
      if (!(await loadProfile())) clearLocalSession();
      return;
    } catch (error) {
      console.warn("Session restore failed, retrying", error);
      await delay(
        Math.min(
          SESSION_RESTORE_RETRY_MIN_MS * 2 ** attempt,
          SESSION_RESTORE_RETRY_MAX_MS,
        ),
      );
    }
  }
}

async function startSession(
  result: { sessionToken: string } | { error: string },
): Promise<SignInResult> {
  if ("error" in result) return { error: result.error };
  sessionToken = result.sessionToken;
  cachedJwt = null;
  try {
    await writeSecure(SESSION_TOKEN_KEY, sessionToken);
  } catch (error) {
    console.warn("Saving the session failed", error);
    clearLocalSession();
    return { error: "storage" };
  }
  try {
    if (await loadProfile()) return {};
  } catch {
    clearLocalSession();
    return { error: "network" };
  }
  clearLocalSession();
  return { error: "profile" };
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  return startSession(await backend.signIn(email.trim(), password));
}

export async function signOut(): Promise<void> {
  const token = sessionToken;
  clearLocalSession();
  if (token) await backend.signOut(token);
}

export function setActiveOrg(orgId: string): void {
  writeKv(ACTIVE_ORG_KEY, orgId);
  setSnapshot({ activeOrgId: orgId });
}

export async function refreshOrganizations(): Promise<void> {
  if (snapshot.status === "signed-in") await loadProfile();
}
