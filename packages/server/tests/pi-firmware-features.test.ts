import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isFirmwareFeatureSupported,
  isFirmwareVersionOutdated,
} from "@magic-vault/shared";

test("Pi firmware is not compared against Arduino releases", () => {
  assert.equal(isFirmwareVersionOutdated("pi-0.1.0", "2.11.0"), false);
  assert.equal(isFirmwareVersionOutdated("pi-0.1.0", null), false);
  assert.equal(isFirmwareVersionOutdated("pi-0.1.0", "pi-0.2.0"), true);
  assert.equal(isFirmwareVersionOutdated("2.10.0", "2.11.0"), true);
});

test("Pi only advertises implemented firmware commands", () => {
  for (const feature of [
    "pipelinedFeed",
    "feederRollback",
    "storedCalibration",
    "paddleOpenDelay",
  ] as const) {
    assert.equal(isFirmwareFeatureSupported("pi-0.1.0", feature), true);
  }
  assert.equal(isFirmwareFeatureSupported("pi-0.1.0", "wifiRemote"), false);
  assert.equal(isFirmwareFeatureSupported("pi-0.1.0", "retractCard"), false);
  assert.equal(isFirmwareFeatureSupported("2.11.0", "retractCard"), true);
});
