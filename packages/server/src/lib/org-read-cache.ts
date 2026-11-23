import {
  ORG_EVENTS_WITH_ONLY_CARD_DATA_CHANGES,
  ORG_EVENTS_WITHOUT_DATA_CHANGES,
} from "./constants/org-read-cache";
import type { OrgReadCache, OrgReadCacheOptions } from "./interfaces/cached-value";
import { createKeyedCache } from "./keyed-cache";
import { createSpacedLoader } from "./spaced-loader";

const dataGenerationByOrgId = new Map<string, number>();
const cardDataGenerationByOrgId = new Map<string, number>();

function bumpGeneration(generationByOrgId: Map<string, number>, orgId: string): void {
  generationByOrgId.set(orgId, (generationByOrgId.get(orgId) ?? 0) + 1);
}

export function invalidateOrgReadCaches(orgId: string): void {
  bumpGeneration(dataGenerationByOrgId, orgId);
  bumpGeneration(cardDataGenerationByOrgId, orgId);
}

export function invalidateOrgCardReadCaches(orgId: string): void {
  bumpGeneration(cardDataGenerationByOrgId, orgId);
}

export function invalidateOrgReadCachesForEvent(orgId: string, event: string): void {
  if (ORG_EVENTS_WITHOUT_DATA_CHANGES.has(event)) return;
  if (ORG_EVENTS_WITH_ONLY_CARD_DATA_CHANGES.has(event)) {
    invalidateOrgCardReadCaches(orgId);
    return;
  }
  invalidateOrgReadCaches(orgId);
}

export function isMutatingRequestMethod(method: string): boolean {
  return method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
}

export function createOrgReadCache<T>(
  name: string,
  ttlMs: number,
  maxEntries: number,
  minimumMsBetweenLoads = 0,
  { isUnaffectedByCardWrites = false }: OrgReadCacheOptions = {},
): OrgReadCache<T> {
  const cache = createKeyedCache<T>(name, ttlMs, maxEntries);
  const spacedLoader = createSpacedLoader<T>(minimumMsBetweenLoads, maxEntries);
  return {
    get(orgId, variantKey, load) {
      const generationByOrgId = isUnaffectedByCardWrites
        ? dataGenerationByOrgId
        : cardDataGenerationByOrgId;
      const generation = generationByOrgId.get(orgId) ?? 0;
      return cache.get(`${orgId}\u0000${generation}\u0000${variantKey}`, () =>
        spacedLoader.load(`${orgId}\u0000${variantKey}`, load),
      );
    },
  };
}
