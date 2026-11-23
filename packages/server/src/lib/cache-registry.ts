import type { AdminCacheKeysPage, AdminCacheSummary } from "@magic-vault/shared";
import { createHash } from "node:crypto";
import {
  MASKED_CACHE_KEY_HASH_LENGTH,
  MASKED_CACHE_KEY_PREFIX,
} from "./constants/cache-registry";
import type { RegisteredCache } from "./interfaces/cached-value";

const registeredCachesByName = new Map<string, RegisteredCache>();

function uniqueCacheName(name: string): string {
  if (!registeredCachesByName.has(name)) return name;
  let suffix = 2;
  while (registeredCachesByName.has(`${name}#${suffix}`)) suffix += 1;
  return `${name}#${suffix}`;
}

function shownKeyOf(cache: RegisteredCache, key: string): string {
  if (!cache.hasSecretKeys) return key;
  const hash = createHash("sha256").update(key).digest("hex");
  return `${MASKED_CACHE_KEY_PREFIX}${hash.slice(0, MASKED_CACHE_KEY_HASH_LENGTH)}`;
}

export function registerCache(cache: RegisteredCache): string {
  const name = uniqueCacheName(cache.name);
  registeredCachesByName.set(name, { ...cache, name });
  return name;
}

export function registerMapCache(
  name: string,
  entries: Map<string, unknown>,
  { onClear, hasSecretKeys = false }: { onClear?: () => void; hasSecretKeys?: boolean } = {},
): string {
  return registerCache({
    name,
    hasSecretKeys,
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
  for (const storedKey of cache.listKeys()) {
    const key = shownKeyOf(cache, storedKey);
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
  return cache.deleteKeys((key) => shouldDelete(shownKeyOf(cache, key)));
}

export function deleteKeysContainingFromEveryCache(text: string): number {
  let deletedCount = 0;
  for (const cache of registeredCachesByName.values()) {
    if (cache.hasSecretKeys) continue;
    deletedCount += cache.deleteKeys((key) => key.includes(text));
  }
  return deletedCount;
}
