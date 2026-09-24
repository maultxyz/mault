import { ACTIVE_ORG_STORAGE_KEY as ORG_KEY } from "@/lib/constants/storage-keys";

let activeOrgId: string | null = localStorage.getItem(ORG_KEY);
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
  if (orgId) localStorage.setItem(ORG_KEY, orgId);
  else localStorage.removeItem(ORG_KEY);
  for (const listener of listeners) listener();
}
