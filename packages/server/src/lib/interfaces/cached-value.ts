export interface CachedValue<T> {
  get(maxAgeMs: number): Promise<T>;
  invalidate(): void;
}
