import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { createKeyedCache } from "../src/lib/keyed-cache";

const TTL_MS = 10_000;

function countingLoader<T>(values: (T | Error)[]) {
  let loadCount = 0;
  return {
    loadCount: () => loadCount,
    load: async (): Promise<T> => {
      const value = values[Math.min(loadCount, values.length - 1)];
      loadCount += 1;
      if (value instanceof Error) throw value;
      return value;
    },
  };
}

function deferredLoader<T>() {
  let loadCount = 0;
  const pending: {
    resolve: (value: T) => void;
    reject: (error: Error) => void;
  }[] = [];
  return {
    loadCount: () => loadCount,
    pending,
    load: (): Promise<T> => {
      loadCount += 1;
      return new Promise<T>((resolve, reject) => {
        pending.push({ resolve, reject });
      });
    },
  };
}

function freezeClock(t: TestContext): void {
  t.mock.timers.enable({ apis: ["Date"], now: 1_000_000 });
}

async function settleBackgroundWork(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

test("a fresh entry is served without loading again", async (t) => {
  freezeClock(t);
  const cache = createKeyedCache<string>("test.keyed", TTL_MS, 10, {
    staleWhileRefreshingMs: TTL_MS,
  });
  const loader = countingLoader(["first", "second"]);
  assert.equal(await cache.get("key", loader.load), "first");
  t.mock.timers.tick(TTL_MS - 1);
  assert.equal(await cache.get("key", loader.load), "first");
  assert.equal(loader.loadCount(), 1);
});

test("an entry inside the stale window is served at once while it refreshes", async (t) => {
  freezeClock(t);
  const cache = createKeyedCache<string>("test.keyed", TTL_MS, 10, {
    staleWhileRefreshingMs: TTL_MS,
  });
  const loader = deferredLoader<string>();
  const first = cache.get("key", loader.load);
  loader.pending[0].resolve("first");
  assert.equal(await first, "first");

  t.mock.timers.tick(TTL_MS + 1);
  assert.equal(await cache.get("key", loader.load), "first");
  assert.equal(loader.loadCount(), 2);

  loader.pending[1].resolve("second");
  await settleBackgroundWork();
  assert.equal(await cache.get("key", loader.load), "second");
  assert.equal(loader.loadCount(), 2);
});

test("only one refresh runs for a stale entry however many requests arrive", async (t) => {
  freezeClock(t);
  const cache = createKeyedCache<string>("test.keyed", TTL_MS, 10, {
    staleWhileRefreshingMs: TTL_MS,
  });
  const loader = deferredLoader<string>();
  const first = cache.get("key", loader.load);
  loader.pending[0].resolve("first");
  await first;

  t.mock.timers.tick(TTL_MS + 1);
  const served = await Promise.all([
    cache.get("key", loader.load),
    cache.get("key", loader.load),
    cache.get("key", loader.load),
  ]);
  assert.deepEqual(served, ["first", "first", "first"]);
  assert.equal(loader.loadCount(), 2);
});

test("an entry expired past the stale window blocks on a fresh load", async (t) => {
  freezeClock(t);
  const cache = createKeyedCache<string>("test.keyed", TTL_MS, 10, {
    staleWhileRefreshingMs: TTL_MS,
  });
  const loader = countingLoader(["first", "second"]);
  await cache.get("key", loader.load);
  t.mock.timers.tick(TTL_MS * 2);
  assert.equal(await cache.get("key", loader.load), "second");
  assert.equal(loader.loadCount(), 2);
});

test("a failed background refresh keeps the stale entry only until its window ends", async (t) => {
  freezeClock(t);
  const cache = createKeyedCache<string>("test.keyed", TTL_MS, 10, {
    staleWhileRefreshingMs: TTL_MS,
  });
  const loader = countingLoader<string>([
    "first",
    new Error("database unavailable"),
  ]);
  await cache.get("key", loader.load);

  t.mock.timers.tick(TTL_MS + 1);
  assert.equal(await cache.get("key", loader.load), "first");
  await settleBackgroundWork();
  assert.equal(loader.loadCount(), 2);

  assert.equal(await cache.get("key", loader.load), "first");
  await settleBackgroundWork();
  assert.equal(loader.loadCount(), 3);

  t.mock.timers.tick(TTL_MS);
  await assert.rejects(cache.get("key", loader.load), /database unavailable/);
});

test("a refresh that finds nothing drops the stale entry", async (t) => {
  freezeClock(t);
  const cache = createKeyedCache<{ role: string } | null>("test.keyed", TTL_MS, 10, {
    staleWhileRefreshingMs: TTL_MS,
  });
  const loader = countingLoader<{ role: string } | null>([
    { role: "member" },
    null,
  ]);
  await cache.get("key", loader.load);

  t.mock.timers.tick(TTL_MS + 1);
  assert.deepEqual(await cache.get("key", loader.load), { role: "member" });
  await settleBackgroundWork();
  assert.equal(await cache.get("key", loader.load), null);
  assert.equal(loader.loadCount(), 3);
});

test("a missing value is never cached", async (t) => {
  freezeClock(t);
  const cache = createKeyedCache<string | null>("test.keyed", TTL_MS, 10, {
    staleWhileRefreshingMs: TTL_MS,
  });
  const loader = countingLoader<string | null>([null, "found"]);
  assert.equal(await cache.get("key", loader.load), null);
  assert.equal(await cache.get("key", loader.load), "found");
  assert.equal(loader.loadCount(), 2);
});

test("without a stale window an expired entry always blocks on a fresh load", async (t) => {
  freezeClock(t);
  const cache = createKeyedCache<string>("test.keyed", TTL_MS, 10);
  const loader = countingLoader(["first", "second"]);
  await cache.get("key", loader.load);
  t.mock.timers.tick(TTL_MS + 1);
  assert.equal(await cache.get("key", loader.load), "second");
  assert.equal(loader.loadCount(), 2);
});

test("requests arriving during a load share it", async (t) => {
  freezeClock(t);
  const cache = createKeyedCache<string>("test.keyed", TTL_MS, 10);
  const loader = deferredLoader<string>();
  const requests = [
    cache.get("key", loader.load),
    cache.get("key", loader.load),
  ];
  loader.pending[0].resolve("first");
  assert.deepEqual(await Promise.all(requests), ["first", "first"]);
  assert.equal(loader.loadCount(), 1);
});
