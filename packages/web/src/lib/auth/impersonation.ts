import { IMPERSONATION_STORAGE_KEY as STORAGE_KEY } from "@/lib/constants/storage-keys";
import type { ImpersonationState } from "@/lib/interfaces/auth";
import type { ImpersonationSession } from "@magic-vault/shared";

export type { ImpersonationState };

function readInitialState(): ImpersonationState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ImpersonationState) : null;
  } catch {
    return null;
  }
}

let state: ImpersonationState | null = readInitialState();
const listeners = new Set<() => void>();

function persist() {
  try {
    if (state) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function notify() {
  for (const listener of listeners) listener();
}

export function getImpersonationState(): ImpersonationState | null {
  return state;
}

export function subscribeImpersonation(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function beginImpersonation(session: ImpersonationSession) {
  state = {
    token: session.token,
    expiresAt: session.expiresAt,
    user: session.user,
    orgs: session.orgs,
    activeOrgId: session.orgs[0]?.id ?? null,
  };
  persist();
  notify();
}

export function setImpersonationOrgId(orgId: string) {
  if (!state) return;
  state = { ...state, activeOrgId: orgId };
  persist();
  notify();
}

export function clearImpersonation() {
  if (!state) return;
  state = null;
  persist();
  notify();
}
