import assert from "node:assert/strict";
import { EventEmitter, once } from "node:events";
import { test } from "node:test";
import { PiControllerHub } from "../src/lib/pi-controller-hub";
import type { SorterPort } from "../src/lib/interfaces/pi-serial";

class FakeControllerPort extends EventEmitter implements SorterPort {
  isOpen = true;
  commands: Record<string, unknown>[] = [];

  write(data: string | Buffer, callback?: (error?: Error | null) => void) {
    this.commands.push(JSON.parse(data.toString()));
    callback?.(null);
  }

  reply(index: number, response: Record<string, unknown> = { status: "ok" }) {
    this.emit(
      "data",
      Buffer.from(
        `${JSON.stringify({ ...response, seq: this.commands[index].seq })}\n`,
      ),
    );
  }

  close() {
    this.isOpen = false;
    this.emit("close");
  }
}

async function request(port: SorterPort, command: Record<string, unknown>) {
  const received = once(port, "data");
  port.write(`${JSON.stringify(command)}\n`);
  return JSON.parse((await received)[0].toString()) as Record<string, unknown>;
}

test("updates close idle GPIO viewers and prevent reconnects until resumed", async () => {
  const ports: FakeControllerPort[] = [];
  const hub = new PiControllerHub(async () => {
    const port = new FakeControllerPort();
    ports.push(port);
    return port;
  });
  const desktop = await hub.open("bridge");
  const mobile = await hub.open("bridge");
  desktop.write('{"getStatus":true,"seq":1}\n');
  const resume = hub.suspendForUpdate();
  assert.equal(desktop.isOpen, false);
  assert.equal(mobile.isOpen, false);
  assert.equal(ports[0].isOpen, false);
  assert.equal(hub.owner(), null);
  await assert.rejects(hub.open("bridge"), /busy/);
  await assert.rejects(hub.open("session"), /busy/);
  assert.throws(() => hub.suspendForUpdate(), /busy/);
  assert.equal(ports[0].commands.length, 1);
  resume();
  const reconnected = await hub.open("bridge");
  assert.equal(reconnected.isOpen, true);
  assert.equal(ports.length, 2);
  reconnected.close();
});

test("updates refuse active GPIO motion and queued configuration without disconnecting", async () => {
  const physical = new FakeControllerPort();
  const hub = new PiControllerHub(async () => physical);
  const browser = await hub.open("bridge");
  browser.write('{"test":true,"seq":1}\n');
  assert.throws(() => hub.suspendForUpdate(), /busy/);
  assert.equal(browser.isOpen, true);
  assert.equal(physical.isOpen, true);
  physical.reply(0);
  browser.write('{"getStatus":true,"seq":2}\n');
  browser.write('{"setConfig":{"module":1},"seq":3}\n');
  assert.throws(() => hub.suspendForUpdate(), /busy/);
  physical.reply(1);
  physical.reply(2);
  hub.suspendForUpdate()();
});

test("updates refuse a GPIO scan reservation even between commands", async () => {
  const hub = new PiControllerHub(async () => new FakeControllerPort());
  const scan = await hub.open("session");
  assert.throws(() => hub.suspendForUpdate(), /busy/);
  assert.equal(scan.isOpen, true);
  scan.close();
});

test("updates refuse GPIO connections that are still opening", async () => {
  let opened!: (port: SorterPort) => void;
  const hub = new PiControllerHub(() => new Promise((resolve) => { opened = resolve; }));
  const connection = hub.open("bridge");
  assert.throws(() => hub.suspendForUpdate(), /busy/);
  opened(new FakeControllerPort());
  (await connection).close();
});

test("updates wait for emergency stop confirmation", async () => {
  const physical = new FakeControllerPort();
  const hub = new PiControllerHub(async () => physical);
  const browser = await hub.open("bridge");
  browser.write('{"stop":true,"seq":1}\n');
  assert.throws(() => hub.suspendForUpdate(), /busy/);
  physical.reply(0, { status: "stopped" });
  hub.suspendForUpdate()();
});

for (const owner of ["bridge", "session"] as const) {
  test(`pipelined feed events reach only the routing ${owner}, not other browsers`, async (context) => {
    const physical = new FakeControllerPort();
    const hub = new PiControllerHub(async () => physical);
    context.after(() => {
      hub.release("session");
      hub.release("bridge");
    });
    const browser = await hub.open("bridge");
    const routing = await hub.open(owner);
    const browserEvents: unknown[] = [];
    const routingEvents: unknown[] = [];
    browser.on("data", (data) => browserEvents.push(JSON.parse(data.toString())));
    routing.on("data", (data) => routingEvents.push(JSON.parse(data.toString())));
    routing.write(JSON.stringify({ seq: 1, route: { module: 2, direction: "left", feedNext: true } }) + "\n");
    const feed = { event: "fed", detected: true, empty: false };
    physical.emit("data", Buffer.from(JSON.stringify(feed) + "\n"));
    assert.deepEqual(routingEvents, [feed]);
    assert.deepEqual(browserEvents, []);
    physical.reply(0, { status: "routed", fedNext: true });
    assert.equal(routingEvents.length, 2);
    assert.deepEqual(browserEvents, []);
  });
}

test("multiple viewers share one controller and cannot consume each other's seq replies", async (context) => {
  const physical = new FakeControllerPort();
  let opens = 0;
  const hub = new PiControllerHub(async () => {
    opens++;
    return physical;
  });
  context.after(() => hub.release("bridge"));
  const [desktop, mobile] = await Promise.all([
    hub.open("bridge"),
    hub.open("bridge"),
  ]);
  assert.equal(opens, 1);
  const desktopReply = request(desktop, { getStatus: true, seq: 1 });
  const mobileReply = request(mobile, { getStatus: true, seq: 1 });
  physical.reply(0, { version: "pi-0.1.0", board: "raspberry_pi" });
  assert.equal((await desktopReply).seq, 1);
  assert.equal(physical.commands.length, 2);
  physical.reply(1, { version: "pi-0.1.0", board: "raspberry_pi" });
  assert.equal((await mobileReply).seq, 1);
  const nextReply = request(mobile, { readIR: true, seq: 1 });
  physical.reply(2, { ir: [false, false, false, false, false] });
  assert.equal((await nextReply).seq, 1);
  assert.notEqual(physical.commands[0].seq, physical.commands[1].seq);
});

test("status heartbeats stay connected during another browser's test, without competing motion", async (context) => {
  const physical = new FakeControllerPort();
  const hub = new PiControllerHub(async () => physical);
  context.after(() => hub.release("bridge"));
  const desktop = await hub.open("bridge");
  const mobile = await hub.open("bridge");
  const identified = request(desktop, { getStatus: true, seq: 1 });
  physical.reply(0, { version: "pi-0.1.0", servoDriver: "ok", uptimeMs: 1000 });
  await identified;
  const tested = request(mobile, { test: true, seq: 1 });
  const heartbeat = await request(desktop, { getStatus: true, seq: 2 });
  assert.equal(heartbeat.version, "pi-0.1.0");
  assert.equal(heartbeat.seq, 2);
  assert.equal(
    (await request(desktop, { feeder: true, seq: 3 })).error,
    "busy",
  );
  assert.equal(physical.commands.length, 2);
  physical.reply(1, { status: "test_complete" });
  assert.equal((await tested).status, "test_complete");
});

test("a server scan can reserve motion while browser viewers remain connected", async (context) => {
  const physical = new FakeControllerPort();
  const hub = new PiControllerHub(async () => physical);
  context.after(() => {
    hub.release("session");
    hub.release("bridge");
  });
  const desktop = await hub.open("bridge");
  const mobile = await hub.open("bridge");
  const scan = await hub.open("session");
  await assert.rejects(hub.open("session"), /busy/);
  assert.equal(hub.owner(), "session");
  assert.equal((await request(mobile, { test: true, seq: 8 })).error, "busy");
  assert.equal(
    (await request(mobile, { setConfig: { feeder: { speed: 315 } }, seq: 7 }))
      .error,
    "busy",
  );
  assert.equal(
    (await request(desktop, { getStatus: true, feeder: true, seq: 9 })).error,
    "busy",
  );
  assert.equal(physical.commands.length, 0);
  const fed = request(scan, { feeder: true, seq: 1 });
  physical.reply(0, { detected: true });
  assert.equal((await fed).detected, true);
  scan.close();
  assert.equal(desktop.isOpen, true);
  assert.equal(mobile.isOpen, true);
  assert.equal(hub.owner(), "bridge");
  const tested = request(mobile, { test: true, seq: 10 });
  physical.reply(1, { status: "test_complete" });
  assert.equal((await tested).status, "test_complete");
});

test("configuration changes and extra motion are rejected even from the same browser during a test", async (context) => {
  const physical = new FakeControllerPort();
  const hub = new PiControllerHub(async () => physical);
  context.after(() => hub.release("bridge"));
  const mobile = await hub.open("bridge");
  const tested = request(mobile, { test: true, seq: 1 });
  assert.equal(
    (await request(mobile, { setConfig: { module: 1 }, seq: 2 })).error,
    "busy",
  );
  assert.equal((await request(mobile, { feeder: true, seq: 3 })).error, "busy");
  physical.reply(0, { status: "test_complete" });
  await tested;
  assert.equal(physical.commands.length, 1);
});

test("closing an idle viewer does not disconnect other viewers or release their outputs", async () => {
  const physical = new FakeControllerPort();
  const hub = new PiControllerHub(async () => physical);
  const desktop = await hub.open("bridge");
  const mobile = await hub.open("bridge");
  desktop.close();
  assert.equal(mobile.isOpen, true);
  assert.equal(physical.isOpen, true);
  mobile.close();
  assert.equal(physical.isOpen, false);
});

test("closing a viewer during a status read preserves the other browser connection", async () => {
  const physical = new FakeControllerPort();
  const hub = new PiControllerHub(async () => physical);
  const desktop = await hub.open("bridge");
  const mobile = await hub.open("bridge");
  desktop.write('{"getStatus":true,"seq":1}\n');
  desktop.close();
  assert.equal(physical.isOpen, true);
  physical.reply(0, { version: "pi-0.1.0" });
  assert.equal(mobile.isOpen, true);
  mobile.close();
});

test("disconnecting during motion cancels the physical command and all clients reconnect safely", async () => {
  const physical = new FakeControllerPort();
  const hub = new PiControllerHub(async () => physical);
  const desktop = await hub.open("bridge");
  const mobile = await hub.open("bridge");
  desktop.write('{"test":true,"seq":1}\n');
  await assert.rejects(hub.open("session"), /busy/);
  desktop.close();
  assert.equal(physical.isOpen, false);
  assert.equal(mobile.isOpen, false);
  assert.equal(hub.owner(), null);
});

test("a lost command times out by closing hardware rather than running queued stale commands", async () => {
  const physical = new FakeControllerPort();
  const hub = new PiControllerHub(async () => physical, 10);
  const mobile = await hub.open("bridge");
  const closed = once(mobile, "close");
  mobile.write('{"test":true,"seq":1}\n{"feeder":true,"seq":2}\n');
  await assert.rejects(closed, /timed out/);
  assert.equal(physical.commands.length, 1);
  assert.equal(physical.isOpen, false);
  assert.equal(hub.owner(), null);
});

test("an emergency stop skips the busy guard and exclusive owner", async (context) => {
  const physical = new FakeControllerPort();
  const hub = new PiControllerHub(async () => physical);
  context.after(() => {
    hub.release("session");
    hub.release("bridge");
  });
  const session = await hub.open("session");
  const browser = await hub.open("bridge");
  const sessionReplies: Record<string, unknown>[] = [];
  const browserReplies: Record<string, unknown>[] = [];
  session.on("data", (data) => sessionReplies.push(JSON.parse(data.toString())));
  browser.on("data", (data) => browserReplies.push(JSON.parse(data.toString())));
  session.write(`${JSON.stringify({ seq: 1, route: { module: 1, direction: "left" } })}\n`);
  browser.write(`${JSON.stringify({ seq: 9, stop: true })}\n`);
  assert.deepEqual(
    physical.commands.map((command) => ("stop" in command ? "stop" : "route")),
    ["route", "stop"],
  );
  physical.reply(1, { status: "stopped" });
  assert.deepEqual(browserReplies, [{ status: "stopped", seq: 9 }]);
  physical.reply(0, { error: "stopped" });
  assert.deepEqual(sessionReplies, [{ error: "stopped", seq: 1 }]);
});

test("module detection changes inputs only when the controller is idle and unreserved", async (context) => {
  const physical = new FakeControllerPort();
  const hub = new PiControllerHub(async () => physical);
  context.after(() => { hub.release("session"); hub.release("bridge"); });
  const browser = await hub.open("bridge");
  const scan = await hub.open("session");
  assert.equal((await request(browser, { detectModules: true, seq: 1 })).error, "busy");
  assert.equal((await request(browser, { getStatus: true, detectModules: true, seq: 2 })).error, "busy");
  assert.equal(physical.commands.length, 0);
  hub.release("session", scan);
  const detected = request(browser, { detectModules: true, seq: 3 });
  physical.reply(0, { status: "ok", modules: 3, sensors: [true, true, true, false, false] });
  assert.equal((await detected).modules, 3);
  const motion = request(browser, { feeder: true, seq: 4 });
  assert.equal((await request(browser, { detectModules: true, seq: 5 })).error, "busy");
  assert.equal(physical.commands.length, 2);
  physical.reply(1);
  await motion;
});
