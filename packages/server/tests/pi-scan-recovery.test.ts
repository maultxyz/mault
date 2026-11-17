import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  PiScanRecoveryState,
  PiScanRunContext,
} from "../src/lib/interfaces/pi-scan";
import { waitForPiScanResume } from "../src/lib/pi-scan/recovery";

function context(): PiScanRunContext {
  // Recovery only reads bin timestamps, contents and fill counts.
  return {
    configs: [{ guid: "bin-1", binNumber: 1, lastEmptiedAt: 0 }],
    contents: [],
    counts: new Map([[1, 5]]),
  } as unknown as PiScanRunContext;
}
function state(): PiScanRecoveryState {
  return {
    phase: "paused",
    pauseRequested: true,
    stopRequested: false,
    refreshRequested: false,
    context: context(),
    message: "Bin full",
  };
}

test("resume waits, then refreshes the same context before continuing a held card", async () => {
  const session = state();
  const retained = session.context;
  let reloads = 0;
  const pending = waitForPiScanResume(session, async () => {
    reloads++;
    const fresh = context();
    fresh.counts.set(1, 0);
    return fresh;
  });
  assert.equal(reloads, 0);
  session.pauseRequested = false;
  session.refreshRequested = true;
  assert.equal(await pending, true);
  assert.equal(session.context, retained);
  assert.equal(session.context!.counts.get(1), 0);
  assert.equal(reloads, 1);
  assert.equal(session.message, null);
});

test("stop while held never reloads or continues routing", async () => {
  const session = state();
  const pending = waitForPiScanResume(session, async () => {
    assert.fail("A stopped session must not reload");
  });
  session.stopRequested = true;
  assert.equal(await pending, false);
});

test("resume preserves unsaved sort-only counts but excludes cards from an emptied bin", async () => {
  const session = state();
  session.pauseRequested = false;
  session.refreshRequested = true;
  session.context!.contents = [
    { binNumber: 1, scannedAt: 10, card: {}, unsaved: true },
    { binNumber: 1, scannedAt: 30, card: {}, unsaved: true },
    { binNumber: 1, scannedAt: 40, card: {} },
  ];
  await waitForPiScanResume(session, async () => {
    const fresh = context();
    fresh.configs[0].lastEmptiedAt = 20;
    fresh.counts.set(1, 0);
    return fresh;
  });
  assert.equal(session.context!.counts.get(1), 1);
  assert.deepEqual(
    session.context!.contents.map((item) => item.scannedAt),
    [30],
  );
});

test("a stop during context refresh prevents another hardware command", async () => {
  const session = state();
  session.pauseRequested = false;
  session.refreshRequested = true;
  const continued = await waitForPiScanResume(session, async () => {
    session.stopRequested = true;
    return context();
  });
  assert.equal(continued, false);
});
