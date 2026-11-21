import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeScannerControlCode, type FoilDetection, type PlayingCardWithDistance } from "@magic-vault/shared";
import { runPiScanCardWorkflow } from "../src/lib/pi-scan/workflow";
import type { PiScanIdentification, PiScanLive, PiScanWorkflowPorts } from "../src/lib/interfaces/pi-scan";

const card = { id: "card", name: "Card" } as PlayingCardWithDistance;
const foil: FoilDetection = { method: "nudge", foilScore: 1, isFoilDetected: true };

function scan(overrides: Partial<PiScanWorkflowPorts> = {}) {
  const events: string[] = [];
  const session = { removalEnabled: false, allowDuplicates: true, lastCardId: null, stopRequested: false } as PiScanLive;
  const identified = { card, matched: { foilDetection: null }, attempts: [] } as unknown as PiScanIdentification;
  const ports: PiScanWorkflowPorts = {
    capture: async () => { events.push("capture"); return Buffer.from("fake-frame"); },
    readControl: async () => { events.push("read-control"); return null; },
    applyControl: async (command) => { events.push(command ? "apply-control" : "invalid-control"); },
    identify: async () => { events.push("identify"); return identified; },
    routeEarly: () => false,
    removal: async () => { events.push("remove"); },
    nudge: async () => { events.push("nudge"); return foil; },
    matched: async (outcome) => { events.push("route-save-matched"); assert.equal(outcome.matched.foilDetection, foil); },
    unmatched: async () => { events.push("route-save-unmatched"); },
    holdDuplicate: () => { events.push("hold-duplicate"); },
    checkpoint: async () => !session.stopRequested,
    ...overrides,
  };
  return { events, session, ports, identified, run: () => runPiScanCardWorkflow(session, ports) };
}

test("Pi production workflow handles control cards before any motion and drops the identification that ran alongside", async () => {
  const command = { condition: "LP" as const, autoFeed: false };
  const current = scan({ readControl: async () => encodeScannerControlCode(command) });
  current.ports.applyControl = async (parsed) => {
    assert.deepEqual(parsed, command);
    current.events.push("apply-control");
  };
  assert.equal(await current.run(), "control");
  assert.deepEqual(current.events, ["capture", "identify", "apply-control"]);
});

test("Pi production workflow restores normal matching for ordinary QR and attaches nudge diagnostics before route/save", async () => {
  const current = scan({ readControl: async () => "https://example.com" });
  assert.equal(await current.run(), "matched");
  assert.deepEqual(current.events, ["capture", "identify", "nudge", "route-save-matched"]);
});

test("Pi production workflow removes cards without nudge or save or duplicate hold", async () => {
  const current = scan();
  current.session.removalEnabled = true;
  current.session.allowDuplicates = false;
  current.session.lastCardId = card.id;
  assert.equal(await current.run(), "removal");
  assert.deepEqual(current.events, ["capture", "identify", "read-control", "remove"]);
});

test("Pi production workflow pauses duplicate cards and refines foil after explicit acceptance", async () => {
  const current = scan();
  current.session.allowDuplicates = false;
  current.session.lastCardId = card.id;
  assert.equal(await current.run(), "duplicate");
  assert.deepEqual(current.events, ["capture", "identify", "read-control", "hold-duplicate", "nudge", "route-save-matched"]);
});

test("Pi production workflow does not route or save a duplicate stopped during its hold", async () => {
  const current = scan();
  current.session.allowDuplicates = false;
  current.session.lastCardId = card.id;
  current.ports.holdDuplicate = () => {
    current.events.push("hold-duplicate");
    current.session.stopRequested = true;
  };
  assert.equal(await current.run(), "duplicate");
  assert.deepEqual(current.events, ["capture", "identify", "read-control", "hold-duplicate"]);
});

test("Pi production workflow stops after pending capture or nudge before routing", async () => {
  for (const boundary of ["capture", "nudge"] as const) {
    const current = scan();
    if (boundary === "capture") {
      current.ports.capture = async () => { current.session.stopRequested = true; return Buffer.from("fake-frame"); };
    } else {
      current.ports.nudge = async () => { current.session.stopRequested = true; return foil; };
    }
    assert.equal(await current.run(), "stopped");
    assert.ok(!current.events.includes("route-save-matched"));
    assert.ok(!current.events.includes("route-save-unmatched"));
  }
});

test("Pi production workflow holds at a checkpoint and resumes the same identified card", async () => {
  const current = scan();
  let release: (() => void) | undefined;
  const paused = new Promise<void>((resolve) => { release = resolve; });
  let checks = 0;
  current.ports.checkpoint = async () => {
    if (++checks === 3) await paused;
    return true;
  };
  const run = current.run();
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(current.events.includes("identify"));
  assert.ok(!current.events.includes("nudge"));
  release!();
  assert.equal(await run, "matched");
  assert.equal(current.events.filter((event) => event === "identify").length, 1);
  assert.equal(current.events.filter((event) => event === "nudge").length, 1);
});

test("Pi production workflow routes before the text match, then saves the final card without a nudge or a stop check", async () => {
  const provisional = { card: { id: "image-card", name: "Card" }, matched: { foilDetection: null }, attempts: [] } as unknown as PiScanIdentification;
  const current = scan();
  current.ports.identify = async (_frame, offerEarlyRoute) => {
    current.events.push("identify");
    offerEarlyRoute(provisional);
    await new Promise((resolve) => setImmediate(resolve));
    return current.identified;
  };
  current.ports.routeEarly = (offered) => {
    assert.equal(offered, provisional);
    current.events.push("route-early");
    current.session.stopRequested = true;
    return true;
  };
  current.ports.matched = async (outcome) => {
    assert.equal(outcome, current.identified);
    current.events.push("save-matched");
  };
  assert.equal(await current.run(), "matched");
  assert.deepEqual(current.events, ["capture", "identify", "read-control", "route-early", "save-matched"]);
});

test("Pi production workflow never routes a control card early", async () => {
  const current = scan({ readControl: async () => encodeScannerControlCode({ autoFeed: false }) });
  current.ports.identify = async (_frame, offerEarlyRoute) => {
    offerEarlyRoute(current.identified);
    return current.identified;
  };
  current.ports.routeEarly = () => {
    current.events.push("route-early");
    return true;
  };
  assert.equal(await current.run(), "control");
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(current.events, ["capture", "apply-control"]);
});
