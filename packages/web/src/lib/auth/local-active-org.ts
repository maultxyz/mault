import { ACTIVE_ORG_STORAGE_KEY as ORG_KEY } from "@/lib/constants/storage-keys";

function readStoredActiveOrgId(): string | null {
  try {
    return localStorage.getItem(ORG_KEY);
  } catch {
    return null;
  }
}

let activeOrgId: string | null = readStoredActiveOrgId();
const listeners = new Set<() => void>();

export function getLocalActiveOrgId(): string | null {
  return activeOrgId;
}

export function subscribeLocalActiveOrg(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setLocalActiveOrgId(orgId: string | null) {
  if (orgId === activeOrgId) return;
  activeOrgId = orgId;
  try {
    if (orgId) localStorage.setItem(ORG_KEY, orgId);
    else localStorage.removeItem(ORG_KEY);
  } catch {}
  for (const listener of listeners) listener();
}
