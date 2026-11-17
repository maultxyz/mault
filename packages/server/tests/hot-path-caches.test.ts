import assert from "node:assert/strict";
import { test } from "node:test";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { Transaction } from "../src/db";
import { loadBusinessSettings } from "../src/lib/business-access";
import { invalidateOrgReadCaches } from "../src/lib/org-read-cache";
import { loadOrgPricing } from "../src/lib/price-source";
import {
  markRequestAsReadOnly,
  requestInvalidatesOrgReadCaches,
  type AppEnv,
} from "../src/middleware/auth";
import { compressResponses } from "../src/middleware/compression";

function countingOrgSettingsRunner(row: Record<string, unknown>) {
  let findFirstCount = 0;
  const runner = {
    query: {
      orgSettings: {
        findFirst: async () => {
          findFirstCount += 1;
          return row;
        },
      },
    },
  } as unknown as Transaction;
  return { runner, findFirstCount: () => findFirstCount };
}

test("org pricing is read once per org until the org's data changes", async () => {
  const { runner, findFirstCount } = countingOrgSettingsRunner({
    priceSource: "cardmarket",
    conditionMultipliers: null,
  });
  const first = await loadOrgPricing(runner, "org-hot-path-pricing");
  const second = await loadOrgPricing(runner, "org-hot-path-pricing");
  assert.equal(findFirstCount(), 1);
  assert.equal(first.source, "cardmarket");
  assert.deepEqual(second, first);
  await loadOrgPricing(runner, "org-hot-path-pricing-other");
  assert.equal(findFirstCount(), 2);
  invalidateOrgReadCaches("org-hot-path-pricing");
  await loadOrgPricing(runner, "org-hot-path-pricing");
  assert.equal(findFirstCount(), 3);
});

test("business settings are read once per org until the org's data changes", async () => {
  const { runner, findFirstCount } = countingOrgSettingsRunner({
    buylistConfig: null,
    businessPermissions: null,
  });
  await loadBusinessSettings(runner, "org-hot-path-business");
  await loadBusinessSettings(runner, "org-hot-path-business");
  assert.equal(findFirstCount(), 1);
  invalidateOrgReadCaches("org-hot-path-business");
  await loadBusinessSettings(runner, "org-hot-path-business");
  assert.equal(findFirstCount(), 2);
});

function appWithCompression() {
  return new Hono()
    .use(compressResponses)
    .get("/json", (c) => c.json({ cards: "x".repeat(4096) }))
    .get("/stream", (c) =>
      streamSSE(c, async (stream) => {
        await stream.writeSSE({ event: "ready", data: "{}" });
      }),
    )
    .get("/encoded", (c) =>
      c.body("already encoded", 200, {
        "Content-Type": "application/json",
        "Content-Encoding": "identity",
      }),
    );
}

test("JSON responses are gzipped with a Vary header", async () => {
  const response = await appWithCompression().request("/json", {
    headers: { "Accept-Encoding": "gzip" },
  });
  assert.equal(response.headers.get("Content-Encoding"), "gzip");
  assert.equal(response.headers.get("Vary"), "Accept-Encoding");
  const body = JSON.parse(
    await new Response(
      response.body!.pipeThrough(new DecompressionStream("gzip")),
    ).text(),
  ) as { cards: string };
  assert.equal(body.cards.length, 4096);
});

test("JSON responses stay plain when the client does not accept gzip", async () => {
  const response = await appWithCompression().request("/json");
  assert.equal(response.headers.get("Content-Encoding"), null);
  assert.equal(response.headers.get("Vary"), null);
});

test("server-sent events are never compressed", async () => {
  const response = await appWithCompression().request("/stream", {
    headers: { "Accept-Encoding": "gzip" },
  });
  assert.equal(response.headers.get("Content-Encoding"), null);
  assert.match(await response.text(), /event: ready/);
});

test("responses a route already encoded are left untouched", async () => {
  const response = await appWithCompression().request("/encoded", {
    headers: { "Accept-Encoding": "gzip" },
  });
  assert.equal(response.headers.get("Content-Encoding"), "identity");
  assert.equal(response.headers.get("Vary"), null);
});

test("read-only POST routes skip the org cache invalidation that other writes trigger", () => {
  assert.equal(requestInvalidatesOrgReadCaches("POST", false), true);
  assert.equal(requestInvalidatesOrgReadCaches("DELETE", false), true);
  assert.equal(requestInvalidatesOrgReadCaches("POST", true), false);
  assert.equal(requestInvalidatesOrgReadCaches("GET", false), false);
});

test("markRequestAsReadOnly flags the request for requireOrg", async () => {
  const app = new Hono<AppEnv>()
    .post("/marked", markRequestAsReadOnly, (c) =>
      c.json({ skips: c.get("skipsOrgReadCacheInvalidation") === true }),
    )
    .post("/unmarked", (c) =>
      c.json({ skips: c.get("skipsOrgReadCacheInvalidation") === true }),
    );
  const marked = (await (await app.request("/marked", { method: "POST" })).json()) as { skips: boolean };
  const unmarked = (await (await app.request("/unmarked", { method: "POST" })).json()) as { skips: boolean };
  assert.equal(marked.skips, true);
  assert.equal(unmarked.skips, false);
});
