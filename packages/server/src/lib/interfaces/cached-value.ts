export interface CachedValue<T> {
  get(maxAgeMs: number, options?: { servesStaleWhileRefreshing?: boolean }): Promise<T>;
  invalidate(): void;
}

export interface OrgReadCache<T> {
  get(orgId: string, variantKey: string, load: () => Promise<T>): Promise<T>;
}

export interface OrgReadCacheOptions {
  isUnaffectedByCardWrites?: boolean;
}

export interface SpacedLoader<T> {
  load(key: string, load: () => Promise<T>): Promise<T>;
}

export interface SpacedLoaderSlot<T> {
  lastStartedAt: number;
  waitingLoad: Promise<T> | null;
}

export interface KeyedCache<T> {
  get(key: string, load: () => Promise<T>): Promise<T>;
  clear(): void;
}
