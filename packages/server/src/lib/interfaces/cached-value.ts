export interface CachedValue<T> {
  get(maxAgeMs: number, options?: { servesStaleWhileRefreshing?: boolean }): Promise<T>;
  invalidate(): void;
}

export interface KeyedCache<T> {
  get(key: string, load: () => Promise<T>): Promise<T>;
  clear(): void;
}
