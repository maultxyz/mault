import assert from "node:assert/strict";
import { test } from "node:test";
import { createRateLimiter } from "../src/lib/public-api/rate-limit";
import { usageEndpointOf } from "../src/lib/public-api/usage-endpoint";
import { createTtlCache } from "../src/lib/ttl-cache";

test("a limiter allows the configured requests per key and then refuses", () => {
  const consume = createRateLimiter({ requests: 2, windowMs: 60_000, sweepSize: 100 });
  assert.equal(consume("link-a").allowed, true);
  assert.equal(consume("link-a").allowed, true);
  assert.equal(consume("link-a").allowed, false);
  assert.equal(consume("link-b").allowed, true);
});

test("usage endpoints group ids, versions and tokens", () => {
  assert.equal(
    usageEndpointOf("get", "/v1/cards/3f2b8c1e-9a4d-4c2b-8e1f-1234567890ab"),
    "GET /v1/cards/{id}",
  );
  assert.equal(
    usageEndpointOf("GET", "/public/firmware-releases/2.14.0/esp32.bin"),
    "GET /public/firmware-releases/{id}/esp32.bin",
  );
  assert.equal(usageEndpointOf("GET", "/public/metrics"), "GET /public/metrics");
});

test("a ttl cache forgets entries after their lifetime and on demand", async () => {
  const cache = createTtlCache<string>({ ttlMs: 20, maxEntries: 10 });
  cache.set("location-1|cards", "page");
  cache.set("location-2|cards", "page");
  assert.equal(cache.get("location-1|cards"), "page");
  cache.deleteWhere((key) => key.startsWith("location-1|"));
  assert.equal(cache.get("location-1|cards"), undefined);
  assert.equal(cache.get("location-2|cards"), "page");
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(cache.get("location-2|cards"), undefined);
});

test("a full ttl cache drops its oldest entry", () => {
  const cache = createTtlCache<number>({ ttlMs: 60_000, maxEntries: 2 });
  cache.set("first", 1);
  cache.set("second", 2);
  cache.set("third", 3);
  assert.equal(cache.get("first"), undefined);
  assert.equal(cache.get("third"), 3);
});
