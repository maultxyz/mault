import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { MILO_MODEL } from "@magic-vault/shared";
import { MiloSyncPool } from "../src/features/admin/lib/milo-sync-pool";
import { BROWSER_EMBED_WORKER_MAX } from "../src/lib/constants/admin";

function workers(t: TestContext, mode: "normal" | "hold" | "fail") {
  const instances: FakeWorker[] = [];
  class FakeWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: (() => void) | null = null;
    terminated = false;
    constructor() { instances.push(this); }
    postMessage(message: { type: string; id?: number }) {
      if (message.type === "embed" && mode === "hold") return;
      queueMicrotask(() => {
        if (this.terminated) return;
        this.onmessage?.({ data: message.type === "init"
          ? { type: "ready" }
          : mode === "fail"
            ? { type: "error", id: message.id, message: "RuntimeError: out of memory" }
            : { type: "embedding", id: message.id, embedding: [1] },
        } as MessageEvent);
      });
    }
    terminate() { this.terminated = true; }
  }
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "Worker");
  Object.defineProperty(globalThis, "Worker", { configurable: true, value: FakeWorker });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, "Worker", descriptor);
    else Reflect.deleteProperty(globalThis, "Worker");
  });
  t.mock.method(globalThis, "fetch", async () => new Response(new Uint8Array([1])));
  t.mock.method(globalThis.crypto.subtle, "digest", async () =>
    Uint8Array.from(Buffer.from(MILO_MODEL.sha256, "hex")).buffer,
  );
  return instances;
}

const canvas = {
  getContext: () => ({ getImageData: () => ({ data: new Uint8ClampedArray(4) }) }),
} as unknown as HTMLCanvasElement;

test("32 cards share a bounded number of model runtimes", async (t) => {
  const instances = workers(t, "normal");
  const pool = await MiloSyncPool.create(32);
  t.after(() => pool.close());
  assert.equal(instances.length, BROWSER_EMBED_WORKER_MAX);
  const results = await Promise.all(Array.from({ length: 32 }, () => pool.embed(canvas)));
  assert.equal(results.length, 32);
  assert.ok(results.every((embedding) => embedding[0] === 1));
});

test("cancelling rejects active and waiting work without poisoning a later pool", async (t) => {
  const instances = workers(t, "hold");
  const controller = new AbortController();
  const pool = await MiloSyncPool.create(32, controller.signal);
  t.after(() => pool.close());
  const pending = Array.from({ length: 32 }, () => pool.embed(canvas));
  const completion = Promise.allSettled(pending);
  await Promise.resolve();
  controller.abort();
  assert.ok((await completion).every((result) => result.status === "rejected"));
  assert.ok(instances.every((worker) => worker.terminated));
  const next = await MiloSyncPool.create(1);
  next.close();
});

test("a fatal inference error stops all work and cannot retry before page reload", async (t) => {
  const instances = workers(t, "fail");
  const pool = await MiloSyncPool.create(32);
  t.after(() => pool.close());
  const results = await Promise.allSettled(Array.from({ length: 32 }, () => pool.embed(canvas)));
  assert.ok(results.every((result) => result.status === "rejected"));
  assert.match(pool.failure!.message, /out of memory/);
  assert.ok(instances.every((worker) => worker.terminated));
  const count = instances.length;
  await assert.rejects(MiloSyncPool.create(32), /out of memory/);
  assert.equal(instances.length, count);
});
