import {
  ORG_RESOURCE_READ_CACHE_MAX_ENTRIES,
  ORG_RESOURCE_READ_CACHE_TTL_MS,
} from "./constants/org-resources";
import { createOrgReadCache } from "./org-read-cache";

const orgResourceReadCache = createOrgReadCache<unknown>(
  ORG_RESOURCE_READ_CACHE_TTL_MS,
  ORG_RESOURCE_READ_CACHE_MAX_ENTRIES,
);

export function readOrgResource<T>(
  orgId: string,
  variantKey: string,
  load: () => Promise<T>,
): Promise<T> {
  return orgResourceReadCache.get(orgId, variantKey, load) as Promise<T>;
}
