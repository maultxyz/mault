import {
  SHARE_LINK_CACHE_MAX_ENTRIES,
  SHARED_STORAGE_READS_CACHE_TTL_MS,
} from "./constants/api-keys";
import { createTtlCache } from "./ttl-cache";

export const sharedStorageReadsCache = createTtlCache<unknown>({
  ttlMs: SHARED_STORAGE_READS_CACHE_TTL_MS,
  maxEntries: SHARE_LINK_CACHE_MAX_ENTRIES,
});

export function sharedStorageReadsKey(
  locationGuid: string,
  showsPrices: boolean,
  read: string,
  query: Record<string, string>,
): string {
  const parameters = Object.entries(query)
    .filter(([name]) => name !== "token")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}=${value}`)
    .join("&");
  return `${locationGuid}|${showsPrices ? "prices" : "no-prices"}|${read}|${parameters}`;
}

export function forgetSharedStorageReads(locationGuid: string): void {
  sharedStorageReadsCache.deleteWhere((key) => key.startsWith(`${locationGuid}|`));
}
