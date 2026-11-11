import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { feedWithRetries } from "@magic-vault/shared";
import { PiScanPrefetch } from "../src/lib/pi-scan/prefetch";
import { routeLoadedPiCard } from "../src/lib/pi-scan/route-card";
import { SorterLink } from "../src/lib/pi-scan/sorter-link";
import { PiControllerHub } from "../src/lib/pi-controller-hub";
import {
  PI_SCAN_FEED_TIMEOUT_MS,
  PI_SCAN_ROUTE_TIMEOUT_MS,
} from "../src/lib/constants/pi-scan";
import { PI_CONTROLLER_COMMAND_TIMEOUT_MS } from "../src/lib/constants/pi-controller";
import type { SorterPort } from "../src/lib/interfaces/pi-serial";

class FakePort extends EventEmitter implements SorterPort {
  isOpen = true;
  writes: Record<string, unknown>[] = [];
  write(text: string, callback?: (error?: Error | null) => void) {
    const command = JSON.parse(text);
    this.writes.push(command);
    callback?.();
    if (command.readIR) this.reply({ seq: command.seq, ir: [true] });
  }
  reply(reply: object) {
    this.emit("data", Buffer.from(`${JSON.stringify(reply)}\n`));
  }
  close() {
    this.isOpen = false;
    this.emit("close");
  }
}

test("the published pipeline contract works through the native shared hub without notifying viewers", async (context) => {
  const physical = new FakePort();
  const hub = new PiControllerHub(async () => physical);
  context.after(() => {
    hub.release("session");
    hub.release("bridge");
  });
  const browser = await hub.open("bridge");
  const session = await hub.open("session");
  const link = new SorterLink(session);
  link.firmwareVersion = "pi-0.1.0";
  const browserEvents: unknown[] = [];
  browser.on("data", (data) => browserEvents.push(JSON.parse(data.toString())));
  let scans = 0;
  const prefetch = new PiScanPrefetch(async () => {
    scans++;
    return "next card";
  });
  const routed = routeLoadedPiCard(link, { module: 3, binNumber: 5, direction: "left" }, {
    enabled: () => true,
    onFed: prefetch.offer,
  });
  await new Promise((resolve) => setImmediate(resolve));
  physical.reply({ event: "fed", detected: true, empty: false });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(scans, 1);
  assert.deepEqual(browserEvents, []);
  physical.reply({ seq: physical.writes[1].seq, status: "routed", fedNext: true });
  await routed;
  assert.equal((await prefetch.take())?.identified, "next card");
  assert.deepEqual(browserEvents, []);
  link.close();
});

for (const builtin of [true, false]) {
  test(`route timeout accounts for early feeding, builtin ${builtin}`, async () => {
    const saved = { PI_HOST: process.env.PI_HOST, PI_SORTER: process.env.PI_SORTER };
    process.env.PI_HOST = "1";
    process.env.PI_SORTER = builtin ? "1" : "0";
    let routeTimeout = 0;
    let listener: ((feed: Record<string, unknown>) => void) | null = null;
    const link = {
      firmwareVersion: builtin ? "pi-0.1.0" : "2.13.0",
      onFed(callback: typeof listener) {
        listener = callback;
        return () => { listener = null; };
      },
      async command(command: object, timeout: number) {
        if ("readIR" in command) return { ir: [true] };
        routeTimeout = timeout;
        listener?.({ event: "fed", detected: true });
        return { status: "routed", fedNext: true };
      },
    } as unknown as SorterLink;
    try {
      await routeLoadedPiCard(link, { module: 2, binNumber: 3, direction: "left" }, {
        enabled: () => true, onFed: () => {},
      });
      if (builtin) {
        assert.ok(routeTimeout < PI_CONTROLLER_COMMAND_TIMEOUT_MS);
        assert.ok(routeTimeout > PI_SCAN_ROUTE_TIMEOUT_MS);
      } else {
        assert.equal(routeTimeout, PI_SCAN_ROUTE_TIMEOUT_MS + PI_SCAN_FEED_TIMEOUT_MS);
      }
    } finally {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
}

test("identifies the next card while the current route is pending, without another hardware command", async () => {
  const port = new FakePort();
  const link = new SorterLink(port);
  link.firmwareVersion = "pi-0.1.0";
  let identified = false;
  const prefetch = new PiScanPrefetch(async () => {
    identified = true;
    return "next card";
  });
  let routed = false;
  const route = routeLoadedPiCard(link, { binNumber: 3, module: 2, direction: "left" }, {
    enabled: () => true,
    onFed: prefetch.offer,
  }).then(() => { routed = true; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(port.writes[1].route, { module: 2, direction: "left", feedNext: true });
  port.reply({ event: "fed", detected: true, empty: false });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(identified, true);
  assert.equal(routed, false);
  assert.equal(port.writes.length, 2);
  port.reply({ seq: port.writes[1].seq, status: "routed" });
  await route;
  assert.deepEqual(await prefetch.take(), {
    feed: { event: "fed", detected: true, empty: false }, identified: "next card",
  });
  assert.equal(await prefetch.take(), null);
  port.reply({ event: "fed", detected: true });
  assert.equal(prefetch.hasPending, false);
  link.close();
});

for (const [version, enabled] of [["2.0.0", true], [null, true], ["pi-0.1.0", false]] as const) {
  test(`sequential fallback for version ${version}, enabled ${enabled}`, async () => {
    const port = new FakePort();
    const link = new SorterLink(port);
    link.firmwareVersion = version;
    const route = routeLoadedPiCard(link, { binNumber: 1, module: 1, direction: "left" }, {
      enabled: () => enabled,
      onFed: () => assert.fail("No feed event expected"),
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(port.writes[1].route, { module: 1, direction: "left" });
    port.reply({ seq: port.writes[1].seq, status: "routed" });
    await route;
    link.close();
  });
}

for (const feed of [{ error: "empty", empty: true }, { error: "timeout: feeder", empty: false }]) {
  test(`does not identify a failed early feed: ${feed.error}`, async () => {
    const prefetch = new PiScanPrefetch(async () => assert.fail("No card was delivered"));
    prefetch.offer(feed);
    assert.deepEqual(await prefetch.take(), { feed, identified: null });
  });
}

test("an early timeout uses the normal retry budget, not an extra initial attempt", async () => {
  const prefetch = new PiScanPrefetch(async () => assert.fail("Feed failed"));
  prefetch.offer({ error: "timeout: feeder", empty: false });
  let buffered = (await prefetch.take())?.feed;
  let retries = 0;
  const fed = await feedWithRetries(async () => {
    if (buffered) {
      const reply = buffered;
      buffered = undefined;
      return reply;
    }
    retries++;
    return { detected: true };
  }, (reply) => reply, 1);
  assert.equal(retries, 1);
  assert.equal(fed.detected, true);
});

test("pause invalidates identification but retains the loaded card for resume", async () => {
  const prefetch = new PiScanPrefetch(async () => "old settings");
  prefetch.offer({ detected: true });
  prefetch.invalidate();
  assert.deepEqual(await prefetch.take(), { feed: { detected: true }, identified: null });
});

test("repeated events cannot replace the buffered next card", async () => {
  const prefetch = new PiScanPrefetch(async () => "first card");
  prefetch.offer({ detected: true });
  prefetch.offer({ error: "timeout" });
  assert.equal((await prefetch.take())?.identified, "first card");
});

test("capture failures are deferred until the next card, or safely discarded on stop/jam", async () => {
  const prefetch = new PiScanPrefetch(async () => { throw new Error("capture failed"); });
  prefetch.offer({ detected: true });
  await new Promise((resolve) => setImmediate(resolve));
  await assert.rejects(prefetch.take(), /capture failed/);
  prefetch.offer({ detected: true });
  await prefetch.discard();
  assert.equal(prefetch.hasPending, false);
});

test("route failure is not treated as successful just because the next card arrived", async () => {
  const port = new FakePort();
  const link = new SorterLink(port);
  link.firmwareVersion = "pi-0.1.0";
  const prefetch = new PiScanPrefetch(async () => "next card");
  const route = routeLoadedPiCard(link, { binNumber: 3, module: 2, direction: "left" }, {
    enabled: () => true, onFed: prefetch.offer,
  });
  const rejected = assert.rejects(route, /jam/);
  await new Promise((resolve) => setImmediate(resolve));
  port.reply({ event: "fed", detected: true });
  port.reply({ seq: port.writes[1].seq, error: "jam at module 2" });
  await rejected;
  await prefetch.discard();
  link.close();
});
