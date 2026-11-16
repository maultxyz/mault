import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyFeedReply, classifyRouteReply } from "@magic-vault/shared";

test("route replies classify in firmware precedence order", () => {
  assert.deepEqual(classifyRouteReply(null), { kind: "noReply" });
  assert.deepEqual(classifyRouteReply({ error: "stopped" }), { kind: "stopped" });
  assert.deepEqual(classifyRouteReply({ skipped: true }), { kind: "skipped" });
  assert.deepEqual(classifyRouteReply({ noLoadedCard: true }), { kind: "noLoadedCard" });
  assert.deepEqual(classifyRouteReply({ empty: true, error: "empty" }), { kind: "hopperEmpty" });
  assert.deepEqual(classifyRouteReply({ status: "routed" }), { kind: "routed", fedNext: false });
  assert.deepEqual(classifyRouteReply({ status: "routed", fedNext: true }), { kind: "routed", fedNext: true });
});

test("only a card lost between modules is a jam", () => {
  assert.deepEqual(
    classifyRouteReply({ error: "timeout: no card detected at module 3" }),
    { kind: "jam", module: 3 },
  );
  assert.deepEqual(
    classifyRouteReply({ error: "timeout: feeder did not deliver card to module 1" }),
    { kind: "error", message: "timeout: feeder did not deliver card to module 1" },
  );
});

test("feed replies honor ignored IR sensors", () => {
  assert.deepEqual(classifyFeedReply(null), { kind: "noReply" });
  assert.deepEqual(classifyFeedReply({ error: "stopped" }), { kind: "stopped" });
  assert.deepEqual(classifyFeedReply({ empty: true }), { kind: "hopperEmpty" });
  assert.deepEqual(classifyFeedReply({ error: "timeout" }), { kind: "error", message: "timeout" });
  assert.deepEqual(classifyFeedReply({ detected: false }), { kind: "noCardDetected" });
  assert.deepEqual(classifyFeedReply({ detected: true }), { kind: "cardArrived" });
  const ignoring = { ignoreIrSensors: true };
  assert.deepEqual(classifyFeedReply({ empty: true }, ignoring), { kind: "cardArrived" });
  assert.deepEqual(classifyFeedReply({ detected: false }, ignoring), { kind: "cardArrived" });
  assert.deepEqual(classifyFeedReply({ empty: true, error: "x" }, ignoring), { kind: "error", message: "x" });
});
