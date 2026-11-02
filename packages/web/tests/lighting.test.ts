import assert from "node:assert/strict";
import test from "node:test";
import { confirmedValueCelebrationDuration, isValueCelebrationDuration, toSetLightCommand, toValueCelebrationCommand } from "../../shared/src/lighting.ts";
import { withFoilLedMask } from "../src/features/calibration/lib/foil-capture-sequence.ts";

test("normal lighting always selects the diffused middle LEDs", () => {
  for (const lightMode of ["white", "custom", "off"] as const) {
    const command = toSetLightCommand({ lightMode, lightBrightness: 48, lightColor: "#123456" });
    assert.equal(command.setLight.leds, 14);
    assert.equal(command.setLight.mode, lightMode);
    assert.equal(command.setLight.brightness, 48);
    if (lightMode === "custom") {
      assert.deepEqual(command.setLight, { mode: "custom", brightness: 48, leds: 14, r: 18, g: 52, b: 86 });
    }
  }
});

test("celebration duration is bounded and explicitly confirmed by firmware", () => {
  for (const durationMs of [100, 500, 3000]) {
    assert.equal(isValueCelebrationDuration(durationMs), true);
    assert.deepEqual(toValueCelebrationCommand(durationMs), { setLight: { mode: "value", durationMs } });
    assert.equal(confirmedValueCelebrationDuration(JSON.stringify({ status: "ok", lightAlert: "value", durationMs }), durationMs), durationMs);
  }
  for (const invalid of [-1, 0, 99, 3001, 500.5, NaN, Infinity]) {
    assert.equal(isValueCelebrationDuration(invalid), false);
    assert.throws(() => toValueCelebrationCommand(invalid), /duration/);
  }
  for (const lightAlert of ["jam", "empty"]) {
    assert.equal(confirmedValueCelebrationDuration(JSON.stringify({ status: "ok", lightAlert }), 500), null);
  }
  for (const response of [null, {}, { status: "ok", lightAlert: "value" },
    { status: "ok", lightAlert: "value", durationMs: 3000 },
    { status: "ok", lightAlert: "none", durationMs: 500 }]) {
    assert.throws(() => confirmedValueCelebrationDuration(JSON.stringify(response), 500));
  }
});

test("foil masks override main lighting and a normal command restores the middle LEDs", () => {
  const command = toSetLightCommand({ lightMode: "white", lightBrightness: 32, lightColor: "#ffffff" }, { clearAlert: true });
  assert.equal(withFoilLedMask(command, 1).setLight.leds, 1);
  assert.equal(withFoilLedMask(command, 16).setLight.leds, 16);
  assert.equal(withFoilLedMask(command, undefined).setLight.leds, 14);
  assert.equal(command.setLight.leds, 14);
  assert.equal(command.clearAlert, true);
});
