import type { AdminCacheKeysPage, AdminCacheSummary } from "@magic-vault/shared";
import type { RegisteredCache } from "./interfaces/cached-value";

const registeredCachesByName = new Map<string, RegisteredCache>();

function uniqueCacheName(name: string): string {
  if (!registeredCachesByName.has(name)) return name;
  let suffix = 2;
  while (registeredCachesByName.has(`${name}#${suffix}`)) suffix += 1;
  return `${name}#${suffix}`;
}

export function registerCache(cache: RegisteredCache): string {
  const name = uniqueCacheName(cache.name);
  registeredCachesByName.set(name, { ...cache, name });
  return name;
}

export function registerMapCache(
  name: string,
  entries: Map<string, unknown>,
  { onClear }: { onClear?: () => void } = {},
): string {
  return registerCache({
    name,
    countEntries: () => entries.size,
    listKeys: () => entries.keys(),
    deleteKeys: (shouldDelete) => {
      let deletedCount = 0;
      for (const key of [...entries.keys()]) {
        if (!shouldDelete(key)) continue;
        entries.delete(key);
        deletedCount += 1;
      }
      return deletedCount;
    },
    clear: () => {
      entries.clear();
      onClear?.();
    },
  });
}

export function clearRegisteredCaches(): number {
  for (const cache of registeredCachesByName.values()) cache.clear();
  return registeredCachesByName.size;
}

export function listRegisteredCaches(): AdminCacheSummary[] {
  return [...registeredCachesByName.values()]
    .map((cache) => ({ name: cache.name, entryCount: cache.countEntries() }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function listRegisteredCacheKeys(
  name: string,
  keyContains: string,
  maxKeys: number,
): AdminCacheKeysPage | null {
  const cache = registeredCachesByName.get(name);
  if (!cache) return null;
  const keys: string[] = [];
  let matchingKeyCount = 0;
  for (const key of cache.listKeys()) {
    if (keyContains && !key.includes(keyContains)) continue;
    matchingKeyCount += 1;
    if (keys.length < maxKeys) keys.push(key);
  }
  keys.sort();
  return { name, keys, matchingKeyCount };
}

export function clearRegisteredCache(name: string): number | null {
  const cache = registeredCachesByName.get(name);
  if (!cache) return null;
  const clearedEntryCount = cache.countEntries();
  cache.clear();
  return clearedEntryCount;
}

export function deleteRegisteredCacheKeys(
  name: string,
  shouldDelete: (key: string) => boolean,
): number | null {
  const cache = registeredCachesByName.get(name);
  if (!cache) return null;
  return cache.deleteKeys(shouldDelete);
}

export function deleteKeysContainingFromEveryCache(text: string): number {
  let deletedCount = 0;
  for (const cache of registeredCachesByName.values()) {
    deletedCount += cache.deleteKeys((key) => key.includes(text));
  }
  return deletedCount;
}
