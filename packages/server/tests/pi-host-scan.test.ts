import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyPiHostStatusEvent,
  piHostCameraReconnectDelayMs,
  piHostScanControls,
  piHostScanSessionPath,
  type PiHostSummary,
  type PiScanSessionState,
} from "@magic-vault/shared";
import { toPendingSaveEvent } from "../src/lib/scan-host/pending-save";

function scanState(overrides: Partial<PiScanSessionState>): PiScanSessionState {
  return {
    phase: "idle",
    collectionGuid: null,
    message: null,
    cardsScanned: 0,
    stopping: false,
    activity: null,
    current: null,
    lastCard: null,
    startedAt: null,
    pausedMs: 0,
    pausedAt: null,
    autoFeed: true,
    ...overrides,
  };
}

test("an offline Pi offers no scan controls", () => {
  const controls = piHostScanControls({ connected: false, scanState: scanState({ phase: "running" }) });
  assert.equal(controls.statusKey, "offline");
  assert.deepEqual(
    [controls.canStart, controls.canPause, controls.canResume, controls.canStop, controls.canEmergencyStop],
    [false, false, false, false, false],
  );
});

test("an idle or freshly connected Pi can only start", () => {
  for (const state of [null, scanState({ phase: "idle" }), scanState({ phase: "stopped" })]) {
    const controls = piHostScanControls({ connected: true, scanState: state });
    assert.equal(controls.statusKey, "idle");
    assert.equal(controls.canStart, true);
    assert.equal(controls.canStop || controls.canPause || controls.canEmergencyStop, false);
  }
});

test("running, paused and stopping scans offer the matching controls", () => {
  const running = piHostScanControls({ connected: true, scanState: scanState({ phase: "running" }) });
  assert.deepEqual(
    [running.statusKey, running.canStart, running.canPause, running.canResume, running.canStop, running.canEmergencyStop],
    ["running", false, true, false, true, true],
  );
  const paused = piHostScanControls({ connected: true, scanState: scanState({ phase: "paused" }) });
  assert.deepEqual([paused.statusKey, paused.canPause, paused.canResume, paused.canStop], ["paused", false, true, true]);
  const stopping = piHostScanControls({
    connected: true,
    scanState: scanState({ phase: "running", stopping: true }),
  });
  assert.deepEqual(
    [stopping.statusKey, stopping.canStart, stopping.canPause, stopping.canStop, stopping.canEmergencyStop],
    ["stopping", false, false, false, true],
  );
  const failed = piHostScanControls({ connected: true, scanState: scanState({ phase: "error" }) });
  assert.deepEqual([failed.statusKey, failed.canStart], ["error", true]);
});

test("status events update only the matching Pi", () => {
  const hosts: PiHostSummary[] = [
    { guid: "a", name: "A", pairedAt: "2026-11-25", lastSeenAt: null, sorterDeviceGuid: null, connected: false, scanState: null },
    { guid: "b", name: "B", pairedAt: "2026-11-25", lastSeenAt: null, sorterDeviceGuid: null, connected: true, scanState: null },
  ];
  const running = scanState({ phase: "running" });
  const updated = applyPiHostStatusEvent(hosts, { hostGuid: "a", connected: true, scanState: running });
  assert.deepEqual(updated[0], { ...hosts[0], connected: true, scanState: running });
  assert.equal(updated[1], hosts[1]);
});

test("the camera viewer backs off, gives up after repeated refusals and reconnects at once to re-authenticate", () => {
  assert.equal(piHostCameraReconnectDelayMs(1006, 1), 3000);
  assert.equal(piHostCameraReconnectDelayMs(1006, 3), 12000);
  assert.equal(piHostCameraReconnectDelayMs(1006, 5), 48000);
  assert.equal(piHostCameraReconnectDelayMs(1006, 6), null);
  assert.equal(piHostCameraReconnectDelayMs(1006, 0), 3000);
  assert.equal(piHostCameraReconnectDelayMs(4002, 9), 0);
});

test("pending save events keep only known fields and the caller's org", () => {
  const body = {
    updatedAt: 5,
    orgId: "someone-else",
    collectionGuid: "collection-1",
    scanId: "scan-1",
    status: "saved",
    extra: "<script>",
    card: { id: "c1", name: "Card", set: "mkm", collectorNumber: "1", html: "<b>" },
  };
  assert.deepEqual(toPendingSaveEvent(body, "org-1"), {
    updatedAt: 5,
    orgId: "org-1",
    collectionGuid: "collection-1",
    scanId: "scan-1",
    status: "saved",
    card: { id: "c1", name: "Card", set: "mkm", collectorNumber: "1" },
  });
  assert.equal(toPendingSaveEvent({ ...body, status: "done" }, "org-1"), null);
  assert.equal(toPendingSaveEvent({ ...body, card: { ...body.card, name: 7 } }, "org-1"), null);
  assert.equal(toPendingSaveEvent(null, "org-1"), null);
});

test("scan session paths are built under the Pi", () => {
  assert.equal(piHostScanSessionPath("abc"), "/pi-hosts/abc/scan-session");
  assert.equal(piHostScanSessionPath("abc", "emergency-stop"), "/pi-hosts/abc/scan-session/emergency-stop");
});
