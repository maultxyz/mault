import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isFirmwareFeatureSupported,
  isFirmwareVersionOutdated,
  isModuleDetectionSupported,
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
    "emergencyStop",
    "pusherNudge",
  ] as const) {
    assert.equal(isFirmwareFeatureSupported("pi-0.1.0", feature), true);
    assert.equal(isFirmwareFeatureSupported("pi-0.2.0", feature), true);
  }
  assert.equal(isFirmwareFeatureSupported("pi-0.1.0", "wifiRemote"), false);
  assert.equal(isFirmwareFeatureSupported("pi-0.1.0", "retractCard"), false);
  assert.equal(isFirmwareFeatureSupported("pi-0.2.0", "wifiRemote"), false);
  assert.equal(isFirmwareFeatureSupported("pi-0.2.0", "retractCard"), false);
  assert.equal(isFirmwareFeatureSupported("2.11.0", "retractCard"), true);
  assert.equal(isFirmwareFeatureSupported("2.13.1", "emergencyStop"), false);
  assert.equal(isFirmwareFeatureSupported("2.13.2", "emergencyStop"), true);
});

test("module detection requires a capable controller version and board", () => {
  assert.equal(isFirmwareFeatureSupported("pi-0.2.0", "moduleDetection"), true);
  assert.equal(isModuleDetectionSupported("pi-0.2.0", "raspberry_pi"), true);
  assert.equal(isModuleDetectionSupported("pi-0.2.0", "esp32"), false);
  for (const version of [
    null,
    undefined,
    "",
    "pi-0.1.0",
    "pi-0.0.0",
    "pi-unknown",
    "pi-1.0.0",
  ]) {
    assert.equal(isFirmwareFeatureSupported(version, "moduleDetection"), false);
    assert.equal(isModuleDetectionSupported(version, "raspberry_pi"), false);
  }
  assert.equal(isModuleDetectionSupported("2.11.0", "esp32"), false);
  assert.equal(isModuleDetectionSupported("2.12.0", "esp32"), true);
  for (const board of [null, undefined, "", "uno_r4", "unknown", "raspberry_pi"]) {
    assert.equal(isModuleDetectionSupported("2.12.0", board), false);
  }
});
