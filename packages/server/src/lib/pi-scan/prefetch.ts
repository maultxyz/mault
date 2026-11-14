export class PiScanPrefetch<T> {
  private pending: {
    feed: Record<string, unknown>;
    result: Promise<{ value: T | null } | { error: unknown }>;
    invalidated: boolean;
  } | null = null;
  constructor(private identify: () => Promise<T | null>) {}
  get hasPending(): boolean {
    return this.pending !== null;
  }
  offer = (feed: Record<string, unknown>): void => {
    if (this.pending) return;
    const result = Promise.resolve()
      .then(() =>
        feed.detected === true && !feed.error ? this.identify() : null,
      )
      .then(
        (value) => ({ value }),
        (error: unknown) => ({ error }),
      );
    this.pending = { feed, result, invalidated: false };
  };
  invalidate(): void {
    if (this.pending) this.pending.invalidated = true;
  }
  async take(): Promise<{
    feed: Record<string, unknown>;
    identified: T | null;
  } | null> {
    const pending = this.pending;
    this.pending = null;
    if (!pending) return null;
    const result = await pending.result;
    if (pending.invalidated) return { feed: pending.feed, identified: null };
    if ("error" in result) throw result.error;
    return { feed: pending.feed, identified: result.value };
  }
  async discard(): Promise<void> {
    const pending = this.pending;
    this.pending = null;
    if (pending) await pending.result;
  }
}
