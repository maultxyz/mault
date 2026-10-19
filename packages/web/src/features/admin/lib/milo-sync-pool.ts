import { fetchPinnedModel } from "@/features/scanner/lib/model-fetch";
import { MILO_INPUT_SIZE, MILO_MODEL } from "@magic-vault/shared";

const EMBED_TIMEOUT_MS = 60_000;

interface ReadyMessage {
  type: "ready";
}

interface InitErrorMessage {
  type: "init-error";
  message: string;
}

interface EmbeddingMessage {
  type: "embedding";
  id: number;
  embedding: number[];
}

interface ErrorMessage {
  type: "error";
  id: number;
  message: string;
}

type WorkerMessage = ReadyMessage | InitErrorMessage | EmbeddingMessage | ErrorMessage;

interface PendingEmbed {
  resolve: (embedding: number[]) => void;
  reject: (err: Error) => void;
}

class SyncWorker {
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
      this.readyReject?.(err);
      for (const pending of this.pending.values()) pending.reject(err);
      this.pending.clear();
    };
    const copy = buffer.slice(0);
    this.worker.postMessage({ type: "init", buffer: copy }, [copy]);
  }

  embed(pixels: ArrayBuffer): Promise<number[]> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error("Embedding timed out."));
      }, EMBED_TIMEOUT_MS);
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
    this.worker.terminate();
  }
}

export class MiloSyncPool {
  private workers: SyncWorker[] = [];
  private idle: SyncWorker[] = [];
  private waiters: ((worker: SyncWorker) => void)[] = [];

  static async create(size: number): Promise<MiloSyncPool> {
    const buffer = await fetchPinnedModel(MILO_MODEL);
    const pool = new MiloSyncPool();
    pool.workers = Array.from({ length: size }, () => new SyncWorker(buffer));
    await Promise.all(pool.workers.map((worker) => worker.ready));
    pool.idle = [...pool.workers];
    return pool;
  }

  async embed(canvas: HTMLCanvasElement): Promise<number[]> {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not get canvas context");
    const pixels = ctx.getImageData(0, 0, MILO_INPUT_SIZE, MILO_INPUT_SIZE).data;
    const copy = pixels.buffer.slice(
      pixels.byteOffset,
      pixels.byteOffset + pixels.byteLength,
    );
    const worker = await this.acquire();
    try {
      return await worker.embed(copy);
    } finally {
      this.release(worker);
    }
  }

  close(): void {
    for (const worker of this.workers) worker.close();
    this.workers = [];
    this.idle = [];
  }

  private acquire(): Promise<SyncWorker> {
    const worker = this.idle.pop();
    if (worker) return Promise.resolve(worker);
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  private release(worker: SyncWorker): void {
    const waiter = this.waiters.shift();
    if (waiter) waiter(worker);
    else this.idle.push(worker);
  }
}
