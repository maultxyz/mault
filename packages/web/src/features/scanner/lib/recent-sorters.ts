import { RECENT_SORTERS_STORAGE_KEY_PREFIX } from "@/lib/constants/storage-keys";
import { rememberRecentSorter, type RecentSorter } from "@magic-vault/shared";

export function readRecentSorters(orgId: string): RecentSorter[] {
  try {
    const raw = localStorage.getItem(`${RECENT_SORTERS_STORAGE_KEY_PREFIX}${orgId}`);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as RecentSorter[]) : [];
  } catch {
    return [];
  }
}

export function rememberRecentSorterForOrg(
  orgId: string,
  connected: Omit<RecentSorter, "connectedAt">,
): void {
  const next = rememberRecentSorter(readRecentSorters(orgId), {
    ...connected,
    connectedAt: new Date().toISOString(),
  });
  try {
    localStorage.setItem(
      `${RECENT_SORTERS_STORAGE_KEY_PREFIX}${orgId}`,
      JSON.stringify(next),
    );
  } catch {}
}
