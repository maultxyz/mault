import { ORG_EVENTS_WITHOUT_DATA_CHANGES } from "./constants/org-read-cache";
import type { OrgReadCache } from "./interfaces/cached-value";
import { createKeyedCache } from "./keyed-cache";

const dataGenerationByOrgId = new Map<string, number>();

export function invalidateOrgReadCaches(orgId: string): void {
  dataGenerationByOrgId.set(orgId, (dataGenerationByOrgId.get(orgId) ?? 0) + 1);
}

export function invalidateOrgReadCachesForEvent(orgId: string, event: string): void {
  if (!ORG_EVENTS_WITHOUT_DATA_CHANGES.has(event)) invalidateOrgReadCaches(orgId);
}

export function isMutatingRequestMethod(method: string): boolean {
  return method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
}

export function createOrgReadCache<T>(ttlMs: number, maxEntries: number): OrgReadCache<T> {
  const cache = createKeyedCache<T>(ttlMs, maxEntries);
  return {
    get(orgId, variantKey, load) {
      const generation = dataGenerationByOrgId.get(orgId) ?? 0;
      return cache.get(`${orgId}\u0000${generation}\u0000${variantKey}`, load);
    },
  };
}
