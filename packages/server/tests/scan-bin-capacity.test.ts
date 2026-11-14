import assert from "node:assert/strict";
import { test } from "node:test";
import { computeBinCapacity, scanBinCapacity, UNLIMITED_BIN_HEIGHT } from "@magic-vault/shared";

test("chaos cap and physical capacity both constrain ordinary bins", () => {
  const chaos = { isChaosMode: true, chaosBinSize: 40 };
  assert.equal(scanBinCapacity(100, 1, chaos, { isCatchAll: false }), 40);
  assert.equal(scanBinCapacity(20, 1, chaos, { isCatchAll: false }), 20);
  assert.equal(scanBinCapacity(UNLIMITED_BIN_HEIGHT, 1, chaos, { isCatchAll: false }), 40);
});

test("catchall bins and non-chaos presets retain physical capacity", () => {
  assert.equal(scanBinCapacity(100, 1, { isChaosMode: true, chaosBinSize: 40 }, { isCatchAll: true }), 100);
  assert.equal(scanBinCapacity(100, 1, { isChaosMode: false, chaosBinSize: 40 }, { isCatchAll: false }), 100);
  assert.equal(scanBinCapacity(UNLIMITED_BIN_HEIGHT, 1, { isChaosMode: true, chaosBinSize: 40 }, { isCatchAll: true }), null);
});

test("missing height or thickness uses the same physical defaults on every scanner", () => {
  assert.equal(scanBinCapacity(null, null, null, { isCatchAll: false }), computeBinCapacity(null, null));
  assert.equal(scanBinCapacity(undefined, undefined, { isChaosMode: true, chaosBinSize: 5 }, { isCatchAll: false }), 5);
  assert.equal(scanBinCapacity(100, 1, { isChaosMode: true, chaosBinSize: null }, { isCatchAll: false }), 100);
});
