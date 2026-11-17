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
