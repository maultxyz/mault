export interface CachedValue<T> {
  get(maxAgeMs: number, options?: { servesStaleWhileRefreshing?: boolean }): Promise<T>;
  invalidate(): void;
}

export interface OrgReadCache<T> {
  get(orgId: string, variantKey: string, load: () => Promise<T>): Promise<T>;
}

export interface OrgReadCacheOptions extends KeyedCacheOptions {
  isUnaffectedByCardWrites?: boolean;
}

export interface SpacedLoader<T> {
  load(key: string, load: () => Promise<T>): Promise<T>;
}

export interface SpacedLoaderSlot<T> {
  lastStartedAt: number;
  waitingLoad: Promise<T> | null;
}

export interface KeyedCacheOptions {
  staleWhileRefreshingMs?: number;
}

export interface KeyedCache<T> {
  get(key: string, load: () => Promise<T>): Promise<T>;
  clear(): void;
}

export interface RegisteredCache {
  name: string;
  hasSecretKeys?: boolean;
  countEntries(): number;
  listKeys(): Iterable<string>;
  deleteKeys(shouldDelete: (key: string) => boolean): number;
  clear(): void;
}
