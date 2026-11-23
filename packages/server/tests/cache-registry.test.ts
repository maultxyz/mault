import assert from "node:assert/strict";
import { test } from "node:test";
import { createCachedValue } from "../src/lib/cached-value";
import {
  clearRegisteredCache,
  deleteKeysContainingFromEveryCache,
  deleteRegisteredCacheKeys,
  listRegisteredCacheKeys,
  listRegisteredCaches,
} from "../src/lib/cache-registry";
import { createKeyedCache } from "../src/lib/keyed-cache";
import { createOrgReadCache } from "../src/lib/org-read-cache";

test("named caches list their entries and delete single keys", async () => {
  const cache = createKeyedCache<string>("test.registry.keyed", 60_000, 10);
  await cache.get("alpha", async () => "a");
  await cache.get("beta", async () => "b");

  const summary = listRegisteredCaches().find((entry) => entry.name === "test.registry.keyed");
  assert.equal(summary?.entryCount, 2);
  assert.deepEqual(listRegisteredCacheKeys("test.registry.keyed", "", 10)?.keys, ["alpha", "beta"]);
  assert.equal(listRegisteredCacheKeys("test.registry.keyed", "alp", 10)?.matchingKeyCount, 1);

  assert.equal(deleteRegisteredCacheKeys("test.registry.keyed", (key) => key === "alpha"), 1);
  let loads = 0;
  await cache.get("alpha", async () => {
    loads += 1;
    return "a";
  });
  await cache.get("beta", async () => {
    loads += 1;
    return "b";
  });
  assert.equal(loads, 1);
});

test("duplicate cache names get a numbered suffix", () => {
  createKeyedCache<string>("test.registry.duplicate", 60_000, 10);
  createKeyedCache<string>("test.registry.duplicate", 60_000, 10);
  const names = listRegisteredCaches().map((entry) => entry.name);
  assert.ok(names.includes("test.registry.duplicate"));
  assert.ok(names.includes("test.registry.duplicate#2"));
});

test("clearing an org removes only that org's org read entries", async () => {
  const cache = createOrgReadCache<number>("test.registry.org", 60_000, 10);
  await cache.get("org-aaaaaaaa", "list", async () => 1);
  await cache.get("org-bbbbbbbb", "list", async () => 2);

  assert.equal(deleteKeysContainingFromEveryCache("org-aaaaaaaa") >= 1, true);
  const keys = listRegisteredCacheKeys("test.registry.org", "", 10)?.keys ?? [];
  assert.equal(keys.length, 1);
  assert.ok(keys[0]?.startsWith("org-bbbbbbbb"));
});

test("a cached value clears through the registry", async () => {
  let computeCount = 0;
  const value = createCachedValue("test.registry.value", async () => {
    computeCount += 1;
    return computeCount;
  });
  await value.get(60_000);
  assert.equal(clearRegisteredCache("test.registry.value"), 1);
  assert.equal(await value.get(60_000), 2);
  assert.equal(clearRegisteredCache("test.registry.missing"), null);
});
