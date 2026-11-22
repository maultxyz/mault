const cacheClearers: (() => void)[] = [];

export function registerCacheClearer(clearCache: () => void): void {
  cacheClearers.push(clearCache);
}

export function clearRegisteredCaches(): number {
  for (const clearCache of cacheClearers) clearCache();
  return cacheClearers.length;
}
