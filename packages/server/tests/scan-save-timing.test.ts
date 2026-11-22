import assert from "node:assert/strict";
import { test } from "node:test";
import { SLOW_SCAN_SAVE_LOG_THRESHOLD_MS } from "../src/lib/constants/timing";
import { startScanSaveTimer } from "../src/lib/scan-save-timing";

function harness() {
  let nowMs = 0;
  const messages: string[] = [];
  const timer = startScanSaveTimer(
    "card",
    () => nowMs,
    (message) => messages.push(message),
  );
  return {
    timer,
    messages,
    advance: (elapsedMs: number) => {
      nowMs += elapsedMs;
    },
  };
}

test("a fast scan save logs nothing", () => {
  const { timer, messages, advance } = harness();
  advance(SLOW_SCAN_SAVE_LOG_THRESHOLD_MS - 1);
  timer.finish("scan-1", "saved");
  assert.deepEqual(messages, []);
});

test("a slow scan save logs when each stage finished", async () => {
  const { timer, messages, advance } = harness();
  advance(40);
  timer.markStage("databaseConnectionAcquired");
  const images = timer.markStageWhenSettled(
    "imagesStored",
    Promise.resolve("stored"),
  );
  advance(SLOW_SCAN_SAVE_LOG_THRESHOLD_MS);
  assert.equal(await images, "stored");
  timer.finish("scan-1", "failed");
  assert.equal(messages.length, 1);
  assert.match(messages[0], /slow card save/);
  const logged = JSON.parse(messages[0].slice(messages[0].indexOf("{")));
  assert.deepEqual(logged, {
    scanId: "scan-1",
    outcome: "failed",
    totalMs: SLOW_SCAN_SAVE_LOG_THRESHOLD_MS + 40,
    elapsedMsByStage: {
      databaseConnectionAcquired: 40,
      imagesStored: SLOW_SCAN_SAVE_LOG_THRESHOLD_MS + 40,
    },
  });
});
