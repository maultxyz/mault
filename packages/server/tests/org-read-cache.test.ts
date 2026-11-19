import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createOrgReadCache,
  invalidateOrgReadCaches,
  invalidateOrgReadCachesForEvent,
  isMutatingRequestMethod,
} from "../src/lib/org-read-cache";

function countingLoader() {
  let loadCount = 0;
  return {
    load: async () => {
      loadCount += 1;
      return { loadCount };
    },
    loadCount: () => loadCount,
  };
}

test("org read cache serves the cached value until the org is invalidated", async () => {
  const cache = createOrgReadCache<{ loadCount: number }>(60_000, 10);
  const loader = countingLoader();
  await cache.get("org-cache-a", "overview", loader.load);
  await cache.get("org-cache-a", "overview", loader.load);
  assert.equal(loader.loadCount(), 1);
  invalidateOrgReadCaches("org-cache-a");
  await cache.get("org-cache-a", "overview", loader.load);
  assert.equal(loader.loadCount(), 2);
});

test("invalidating one org leaves other orgs cached", async () => {
  const cache = createOrgReadCache<{ loadCount: number }>(60_000, 10);
  const loader = countingLoader();
  await cache.get("org-cache-b", "overview", loader.load);
  invalidateOrgReadCaches("org-cache-c");
  await cache.get("org-cache-b", "overview", loader.load);
  assert.equal(loader.loadCount(), 1);
});

test("concurrent reads of the same org share one load", async () => {
  const cache = createOrgReadCache<{ loadCount: number }>(60_000, 10);
  const loader = countingLoader();
  await Promise.all([
    cache.get("org-cache-d", "stats", loader.load),
    cache.get("org-cache-d", "stats", loader.load),
  ]);
  assert.equal(loader.loadCount(), 1);
});

test("presence events keep caches while data events invalidate them", async () => {
  const cache = createOrgReadCache<{ loadCount: number }>(60_000, 10);
  const loader = countingLoader();
  await cache.get("org-cache-e", "overview", loader.load);
  invalidateOrgReadCachesForEvent("org-cache-e", "live_count");
  await cache.get("org-cache-e", "overview", loader.load);
  assert.equal(loader.loadCount(), 1);
  invalidateOrgReadCachesForEvent("org-cache-e", "orders_changed");
  await cache.get("org-cache-e", "overview", loader.load);
  assert.equal(loader.loadCount(), 2);
});

test("only writes count as mutating requests", () => {
  assert.equal(isMutatingRequestMethod("GET"), false);
  assert.equal(isMutatingRequestMethod("HEAD"), false);
  assert.equal(isMutatingRequestMethod("POST"), true);
  assert.equal(isMutatingRequestMethod("DELETE"), true);
});

test("a spaced cache loads the first read at once and delays the next load after an invalidation", async () => {
  const cache = createOrgReadCache<{ loadCount: number }>(60_000, 10, 80);
  const loader = countingLoader();
  const startedAt = Date.now();
  await cache.get("org-cache-f", "summary", loader.load);
  assert.ok(Date.now() - startedAt < 60);
  invalidateOrgReadCaches("org-cache-f");
  const second = await cache.get("org-cache-f", "summary", loader.load);
  assert.equal(second.loadCount, 2);
  assert.ok(Date.now() - startedAt >= 75);
});

test("reads that arrive while a spaced load is waiting share that one load", async () => {
  const cache = createOrgReadCache<{ loadCount: number }>(60_000, 10, 80);
  const loader = countingLoader();
  await cache.get("org-cache-g", "summary", loader.load);
  invalidateOrgReadCaches("org-cache-g");
  const waiting = cache.get("org-cache-g", "summary", loader.load);
  invalidateOrgReadCaches("org-cache-g");
  const joined = cache.get("org-cache-g", "summary", loader.load);
  const [first, second] = await Promise.all([waiting, joined]);
  assert.equal(first.loadCount, 2);
  assert.equal(second.loadCount, 2);
  assert.equal(loader.loadCount(), 2);
});

test("spacing applies per variant, so another variant loads at once", async () => {
  const cache = createOrgReadCache<{ loadCount: number }>(60_000, 10, 5_000);
  const loader = countingLoader();
  await cache.get("org-cache-h", "summary-a", loader.load);
  const startedAt = Date.now();
  await cache.get("org-cache-h", "summary-b", loader.load);
  assert.ok(Date.now() - startedAt < 60);
  assert.equal(loader.loadCount(), 2);
});
