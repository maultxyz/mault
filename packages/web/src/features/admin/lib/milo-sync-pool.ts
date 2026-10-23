import { BROWSER_EMBED_TIMEOUT_MS, BROWSER_EMBED_WORKER_MAX } from "@/lib/constants/admin";
import type { WorkerMessage, PendingEmbed, PendingSyncWorker, SyncEmbedWorker } from "@/lib/interfaces/admin";
import { fetchPinnedModel } from "@/features/scanner/lib/model-fetch";
import { MILO_INPUT_SIZE, MILO_MODEL } from "@magic-vault/shared";

let runtimeFailure: Error | null = null;

class SyncWorker {
  private failure: Error | null = null;
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<number, PendingEmbed>();
  private readyResolve: (() => void) | null = null;
  private readyReject: ((err: Error) => void) | null = null;
  readonly ready: Promise<void>;

  constructor(buffer: ArrayBuffer) {
    this.worker = new Worker(
      new URL("./milo-sync.worker.ts", import.meta.url),
      { type: "module" },
    );
    this.ready = new Promise((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
    const readyTimer = setTimeout(
      () => this.readyReject?.(new Error("Embedder worker timed out while starting.")),
      BROWSER_EMBED_TIMEOUT_MS,
    );
    void this.ready.then(
      () => clearTimeout(readyTimer),
      () => clearTimeout(readyTimer),
    );
    this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      if (message.type === "ready") {
        this.readyResolve?.();
        return;
      }
      if (message.type === "init-error") {
        this.readyReject?.(new Error(message.message));
        return;
      }
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.type === "embedding") pending.resolve(message.embedding);
      else pending.reject(new Error(message.message));
    };
    this.worker.onerror = () => {
      const err = new Error("Embedder worker failed.");
      this.failure = err;
      this.readyReject?.(err);
      for (const pending of this.pending.values()) pending.reject(err);
      this.pending.clear();
    };
    const copy = buffer.slice(0);
    this.worker.postMessage({ type: "init", buffer: copy }, [copy]);
  }

  embed(pixels: ArrayBuffer): Promise<number[]> {
    if (this.failure) return Promise.reject(this.failure);
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error("Embedding timed out."));
      }, BROWSER_EMBED_TIMEOUT_MS);
      this.pending.set(id, {
        resolve: (embedding) => {
          clearTimeout(timer);
          resolve(embedding);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });
      this.worker.postMessage({ type: "embed", id, pixels }, [pixels]);
    });
  }

  close(): void {
    const error = new Error("Embedding worker was stopped.");
    this.readyReject?.(error);
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
    this.worker.terminate();
  }
}

export class MiloSyncPool {
  private workers: SyncWorker[] = [];
  private idle: SyncEmbedWorker[] = [];
  private waiters: PendingSyncWorker[] = [];
  private closed = false;
  private failed: Error | null = null;
  private removeAbortListener = () => {};

  get failure(): Error | null {
    return this.failed;
  }

  static async create(size: number, signal?: AbortSignal): Promise<MiloSyncPool> {
    if (runtimeFailure) throw runtimeFailure;
    const buffer = await fetchPinnedModel(MILO_MODEL);
    if (signal?.aborted) throw new Error("Browser vectorization was stopped.");
    const pool = new MiloSyncPool();
    const abort = () => pool.close();
    signal?.addEventListener("abort", abort, { once: true });
    pool.removeAbortListener = () => signal?.removeEventListener("abort", abort);
    try {
      const workerCount = Math.max(1, Math.min(size, BROWSER_EMBED_WORKER_MAX));
      for (let index = 0; index < workerCount; index++) {
        const worker = new SyncWorker(buffer);
        pool.workers.push(worker);
        await worker.ready;
        if (pool.closed) throw new Error("Browser vectorization was stopped.");
      }
    } catch (error) {
      if (!pool.closed) runtimeFailure = error instanceof Error ? error : new Error(String(error));
      pool.close();
      throw error;
    }
    pool.idle = [...pool.workers];
    return pool;
  }

  async embed(canvas: HTMLCanvasElement): Promise<number[]> {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not get canvas context");
    const pixels = ctx.getImageData(
      0,
      0,
      MILO_INPUT_SIZE,
      MILO_INPUT_SIZE,
    ).data;
    const copy = pixels.buffer.slice(
      pixels.byteOffset,
      pixels.byteOffset + pixels.byteLength,
    );
    const worker = await this.acquire();
    try {
      return await worker.embed(copy);
    } catch (error) {
      if (!this.closed) {
        this.failed = error instanceof Error ? error : new Error(String(error));
        runtimeFailure = this.failed;
        this.close();
      }
      throw error;
    } finally {
      this.release(worker);
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.removeAbortListener();
    const error = this.failed ?? new Error("Browser vectorization was stopped.");
    for (const waiter of this.waiters) waiter.reject(error);
    this.waiters = [];
    for (const worker of this.workers) worker.close();
    this.workers = [];
    this.idle = [];
  }

  private acquire(): Promise<SyncEmbedWorker> {
    if (this.closed) return Promise.reject(this.failed ?? new Error("Browser vectorization was stopped."));
    const worker = this.idle.pop();
    if (worker) return Promise.resolve(worker);
    return new Promise((resolve, reject) => this.waiters.push({ resolve, reject }));
  }

  private release(worker: SyncEmbedWorker): void {
    if (this.closed) return;
    const waiter = this.waiters.shift();
    if (waiter) waiter.resolve(worker);
    else this.idle.push(worker);
  }
}
