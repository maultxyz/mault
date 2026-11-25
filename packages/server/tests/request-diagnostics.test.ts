import assert from "node:assert/strict";
import { test } from "node:test";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { once } from "node:events";
import { authProvider } from "../src/auth";
import { requireAuth } from "../src/middleware/auth";
import { createRequestDiagnostics, markRequestDiagnosticStage } from "../src/middleware/request-diagnostics";
import type { RequestDiagnosticRecord } from "../src/lib/interfaces/request-diagnostics";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const pools = { main: { total: 10, idle: 0, waiting: 3 }, single: { total: 4, idle: 1, waiting: 2 }, background: { total: 2, idle: 2, waiting: 0 } };

function setup(options: Parameters<typeof createRequestDiagnostics>[0] = {}) {
  const records: RequestDiagnosticRecord[] = [];
  const app = new Hono();
  app.use(createRequestDiagnostics({ enabled: () => true, readPools: () => pools, emit: (record) => { records.push(record); }, slowMs: 15, ...options }));
  return { app, records };
}

test("slow auth stage and completion report only whitelisted metadata and numeric pool counts", async () => {
  const { app, records } = setup();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  app.get("/pi-camera/frame", async (c) => {
    markRequestDiagnosticStage(c, "verifyToken");
    await gate;
    markRequestDiagnosticStage(c, "handler");
    return c.text("ok", 202);
  });
  const pending = app.request("/pi-camera/frame?token=SECRET_QUERY", { headers: { Authorization: "Bearer SECRET_TOKEN", "X-Org-Id": "SECRET_ORG" } });
  await delay(40);
  assert.equal(records.length, 1);
  assert.equal(records[0].event, "slow");
  assert.equal(records[0].stage, "verifyToken");
  assert.equal(records[0].status, 0);
  assert.equal(records[0].category, "camera-frame");
  assert.deepEqual(records[0].pools, pools);
  release();
  assert.equal((await pending).status, 202);
  assert.deepEqual(records.map((r) => r.event), ["slow", "complete"]);
  assert.equal(records[1].stage, "handler");
  assert.equal(records[1].status, 202);
  assert.equal(records[0].ordinal, records[1].ordinal);
  assert.ok(!JSON.stringify(records).includes("SECRET"));
});

test("abort cleans timer and frees the bounded slot without cancelling the handler", async () => {
  const { app, records } = setup({ maxTracked: 1 });
  const releases: Array<() => void> = [];
  app.get("/scan-session", async (c) => {
    markRequestDiagnosticStage(c, "orgMembership");
    await new Promise<void>((resolve) => releases.push(resolve));
    return c.text("ok");
  });
  const controller = new AbortController();
  const first = app.request("/scan-session", { signal: controller.signal });
  await delay(40);
  controller.abort();
  assert.deepEqual(records.map((r) => r.event), ["slow", "abort"]);
  const second = app.request("/scan-session");
  await delay(40);
  assert.equal(records[2].event, "slow");
  assert.notEqual(records[2].ordinal, records[0].ordinal);
  for (const release of releases) release();
  assert.equal((await first).status, 200);
  assert.equal((await second).status, 200);
  assert.deepEqual(records.map((r) => r.event), ["slow", "abort", "slow", "complete"]);
  await delay(30);
  assert.equal(records.length, 4);
});

test("completed fast requests release their slot and leave no slow timers", async () => {
  const { app, records } = setup({ maxTracked: 1 });
  app.get("/fast", (c) => c.text("ok"));
  app.get("/slow", async (c) => { await delay(40); return c.text("ok"); });
  await app.request("/fast");
  await delay(30);
  assert.equal(records.length, 0);
  await app.request("/slow");
  assert.deepEqual(records.map((r) => r.event), ["slow", "complete"]);
});

test("tracking cap and non-Pi mode do not change request execution", async () => {
  for (const options of [{ enabled: () => false }, { maxTracked: 0 }]) {
    const { app, records } = setup(options);
    app.get("/test", async (c) => { await delay(30); return c.text("unchanged"); });
    assert.equal(await (await app.request("/test")).text(), "unchanged");
    assert.equal(records.length, 0);
  }
});

test("diagnostic logger and pool observer failures cannot fail requests or reject asynchronously", async () => {
  for (const options of [{ enabled: () => { throw new Error("SECRET_ENABLED_ERROR"); } }, { readPools: () => { throw new Error("SECRET_POOL_ERROR"); } }, { emit: () => { throw new Error("SECRET_LOG_ERROR"); } }, { emit: async () => { throw new Error("SECRET_ASYNC_ERROR"); } }]) {
    const { app } = setup(options);
    app.get("/test", async (c) => { await delay(35); return c.text("unchanged"); });
    assert.equal(await (await app.request("/test")).text(), "unchanged");
    await delay(10);
  }
});

test("actual Node HTTP server survives slow observer failures and serves later requests", async (t) => {
  const { app } = setup({ emit: () => { throw new Error("observer failed"); } });
  app.get("/test", async (c) => { markRequestDiagnosticStage(c, "memberSeat"); await delay(30); return c.text("ok"); });
  const server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 0 });
  if (!server.listening) await once(server, "listening");
  t.after(async () => { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  for (let i = 0; i < 2; i++) {
    const response = await fetch(`http://127.0.0.1:${address.port}/test`);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "ok");
  }
});


test("actual authentication marks a blocked token lookup before entering its handler", async (t) => {
  const { app, records } = setup();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  t.mock.method(authProvider, "verifyToken", async () => { await gate; return { sub: "diagnostic-test-user" }; });
  t.mock.method(authProvider, "getUserRole", async () => "user");
  app.use(requireAuth);
  app.get("/pi-camera/frame", (c) => c.text("ok"));
  const pending = app.request("/pi-camera/frame", { headers: { Authorization: "Bearer nonsecret-test-value" } });
  await delay(40);
  assert.equal(records[0].stage, "verifyToken");
  release();
  assert.equal((await pending).status, 200);
  assert.equal(records[1].stage, "handler");
});

test("concurrent tracking never exceeds the configured cap", async () => {
  const { app, records } = setup({ maxTracked: 1 });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  app.get("/blocked", async (c) => { await gate; return c.text("ok"); });
  const first = app.request("/blocked");
  const second = app.request("/blocked");
  await delay(40);
  assert.equal(records.length, 1);
  release();
  assert.equal((await first).status, 200);
  assert.equal((await second).status, 200);
  assert.deepEqual(records.map((r) => r.event), ["slow", "complete"]);
});


test("fixed route categories identify image and control requests without including dynamic identifiers", async () => {
  const { app, records } = setup({ slowMs: 0 });
  app.all("*", async (c) => { await delay(3); return c.text("ok"); });
  const cases = [
    ["/pi-camera/frame", "camera-frame"], ["/pi-camera/stream", "camera-stream"],
    ["/pi-camera/health", "camera-health"], ["/pi-camera/devices", "camera-devices"],
    ["/scan-session", "scan-status"], ["/scan-session/pause", "scan-pause"],
    ["/scan-session/resume", "scan-resume"], ["/scan-session/emergency-stop", "scan-emergency-stop"],
    ["/scan-session/feed", "scan-feed"], ["/cards/image-proxy?url=SECRET", "card-image-proxy"],
    ["/cards/netdeck-image/SECRET_GAME/SECRET_SLUG/SECRET_PRINTING", "netdeck-image"],
    ["/collections/SECRET_COLLECTION/cards/SECRET_SCAN/image?side=SECRET", "collection-photo-url"],
    ["/collections/SECRET_COLLECTION/cards/SECRET_SCAN/image/download", "collection-photo-download"],
    ["/match-validations/scans/SECRET_SCAN/thumbnail", "scan-thumbnail"],
    ["/SECRET_UNKNOWN", "other"],
  ];
  for (const [path, expected] of cases) {
    await app.request(path);
    assert.equal(records.at(-1)?.category, expected);
  }
  assert.ok(!JSON.stringify(records).includes("SECRET"));
});
