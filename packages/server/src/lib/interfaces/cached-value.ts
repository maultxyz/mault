export interface CachedValue<T> {
  get(maxAgeMs: number): Promise<T>;
  invalidate(): void;
}

export interface KeyedCache<T> {
  get(key: string, load: () => Promise<T>): Promise<T>;
}
