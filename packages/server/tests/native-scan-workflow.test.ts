import assert from "node:assert/strict";
import { test } from "node:test";
import {
  encodeScannerControlCode,
  runScanWorkflow,
  type PlayingCardWithDistance,
  type ScanWorkflowAdapter,
} from "@magic-vault/shared";

function nativeWorkflow(card: PlayingCardWithDistance | null, code: string | null) {
  const events: string[] = [];
  const outcome = { card };
  const adapter: ScanWorkflowAdapter<{ frame: number | null }, typeof outcome> = {
    controlStage: "after-miss",
    capture: async () => ({ frame: null }),
    identify: async (captured) => {
      for (const frame of [1, 2]) {
        captured.frame = frame;
        events.push(`identify-frame-${frame}`);
      }
      return outcome;
    },
    readControl: (captured) => {
      events.push(`read-control-frame-${captured.frame}`);
      return code;
    },
    applyControl: (command) => { events.push(command?.pauseScanner ? "pause-control" : "invalid-control"); },
    card: (result) => result.card,
    isRemoval: () => false,
    remove: () => { events.push("remove"); },
    isDuplicate: () => false,
    duplicate: () => { events.push("duplicate"); },
    matched: () => { events.push("save-matched"); },
    unmatched: () => { events.push("save-unmatched"); },
  };
  return { events, adapter, run: () => runScanWorkflow(adapter) };
}

test("native missed consensus reads control from its final captured frame before removal", async () => {
  const scan = nativeWorkflow(null, encodeScannerControlCode({ pauseScanner: true }));
  scan.adapter.isRemoval = () => true;
  assert.equal(await scan.run(), "control");
  assert.deepEqual(scan.events, ["identify-frame-1", "identify-frame-2", "read-control-frame-2", "pause-control"]);
});

test("native successful identification skips QR work and duplicate matches do not save", async () => {
  const card = { id: "card" } as PlayingCardWithDistance;
  const scan = nativeWorkflow(card, encodeScannerControlCode({ pauseScanner: true }));
  scan.adapter.isDuplicate = () => true;
  assert.equal(await scan.run(), "duplicate");
  assert.deepEqual(scan.events, ["identify-frame-1", "identify-frame-2", "duplicate"]);
});

test("native removal bypasses duplicate authorization and matched persistence", async () => {
  const scan = nativeWorkflow({ id: "card" } as PlayingCardWithDistance, null);
  scan.adapter.isRemoval = () => true;
  scan.adapter.isDuplicate = () => { throw new Error("removal must bypass duplicate handling"); };
  assert.equal(await scan.run(), "removal");
  assert.deepEqual(scan.events, ["identify-frame-1", "identify-frame-2", "remove"]);
});

test("native normal QR misses continue to unmatched persistence", async () => {
  const scan = nativeWorkflow(null, "https://example.com");
  assert.equal(await scan.run(), "unmatched");
  assert.deepEqual(scan.events, ["identify-frame-1", "identify-frame-2", "read-control-frame-2", "save-unmatched"]);
});
