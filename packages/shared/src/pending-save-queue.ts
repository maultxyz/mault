import type { PendingSaveQueueOptions } from "./interfaces/pending-save-queue.interface";
import { isRetryableScanSaveError, pendingScanSaveRetryDelayMs } from "./scan-save";

export class PendingSaveQueue<TSave, TResult> {
  private readonly inFlight = new Set<string>();
  private readonly wakers = new Set<() => void>();
  private stopped = false;

  private readonly options: PendingSaveQueueOptions<TSave, TResult>;

  constructor(options: PendingSaveQueueOptions<TSave, TResult>) {
    this.options = options;
  }

  start(): void {
    this.stopped = false;
  }

  stop(): void {
    this.stopped = true;
  }

  wakeAll(): void {
    for (const wake of [...this.wakers]) wake();
  }

  isInFlight(key: string): boolean {
    return this.inFlight.has(key);
  }

  async submit(save: TSave): Promise<TResult> {
    try {
      return await this.options.send(save, false);
    } catch (error) {
      if (!isRetryableScanSaveError(error)) throw error;
      this.options.onRetryableFailure?.(save, error, false);
    }
    await this.options.put(save);
    return this.retryUntilSettled(save, false);
  }

  async retryUntilSettled(save: TSave, retryImmediately: boolean): Promise<TResult> {
    const key = this.options.keyOf(save);
    this.inFlight.add(key);
    this.options.onPendingCountChange(1);
    try {
      for (let attempt = retryImmediately ? -1 : 0; ; attempt++) {
        if (attempt >= 0) await this.waitForRetry(attempt);
        if (this.stopped) return new Promise<never>(() => {});
        try {
          const result = await this.options.send(save, true);
          await this.options.remove(key);
          return result;
        } catch (error) {
          if (!isRetryableScanSaveError(error)) {
            await this.options.remove(key);
            throw error;
          }
          this.options.onRetryableFailure?.(save, error, true);
        }
      }
    } finally {
      this.inFlight.delete(key);
      this.options.onPendingCountChange(-1);
    }
  }

  private waitForRetry(attempt: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const wake = () => {
        clearTimeout(timer);
        this.wakers.delete(wake);
        resolve();
      };
      const timer = setTimeout(wake, pendingScanSaveRetryDelayMs(attempt));
      this.wakers.add(wake);
    });
  }
}
