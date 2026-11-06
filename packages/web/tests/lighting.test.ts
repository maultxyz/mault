import assert from "node:assert/strict";
import test from "node:test";
import { assertLightWarningReply, confirmedValueCelebrationDuration, isLightTimerSeconds, isValueCelebrationDuration, toSetLightCommand, toValueCelebrationCommand } from "../../shared/src/lighting.ts";
import { isFirmwareFeatureSupported } from "../../shared/src/constants/firmware.constant.ts";
import { lightSettingsSchema } from "../src/schemas/light-settings.schema.ts";
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

test("warning configuration validates seconds and checks the firmware echo", () => {
  const settings = { lightMode: "white" as const, lightColor: "#ffffff", lightBrightness: 160,
    lightWarningsEnabled: true, lightEmptyWarningSeconds: 3, lightBlockedWarningSeconds: 4, lightNormalSeconds: 5 };
  const warnings = { enabled: true, emptySeconds: 3, blockedSeconds: 4, normalSeconds: 5 };
  assert.deepEqual(toSetLightCommand(settings, { warningsSupported: true }).setLight.warnings, warnings);
  assert.equal(toSetLightCommand(settings).setLight.warnings, undefined);
  assert.doesNotThrow(() => assertLightWarningReply(JSON.stringify({ status: "ok", warnings }), settings));
  assert.throws(() => assertLightWarningReply('{"status":"ok"}', settings));
  for (const key of ["enabled", "emptySeconds", "blockedSeconds", "normalSeconds"] as const) {
    assert.throws(() => assertLightWarningReply(JSON.stringify({ status: "ok", warnings: { ...warnings, [key]: null } }), settings));
  }
  for (const value of [1, 3, 300]) assert.equal(isLightTimerSeconds(value), true);
  for (const value of [0, -1, 301, 1.5, NaN, Infinity, "3", null]) {
    assert.equal(isLightTimerSeconds(value), false);
    if (typeof value !== "number") continue;
    for (const key of ["lightEmptyWarningSeconds", "lightBlockedWarningSeconds", "lightNormalSeconds"] as const) {
      assert.throws(() => toSetLightCommand({ ...settings, [key]: value }, { warningsSupported: true }));
    }
  }
  assert.equal(isFirmwareFeatureSupported("2.11.0", "lightingWarnings"), false);
  assert.equal(isFirmwareFeatureSupported("2.12.0", "lightingWarnings"), true);
  assert.equal(confirmedValueCelebrationDuration('{"status":"ok","lightAlert":"none","warningActive":true}', 500), null);
});

test("shipping lighting draft requires valid warning timers and a celebration toggle", () => {
  const draft = { lightMode: "white", lightColor: "#ffffff", lightBrightness: 160,
    lightWarningsEnabled: true, lightEmptyWarningSeconds: 3, lightBlockedWarningSeconds: 3, lightNormalSeconds: 5,
    valueCelebrationEnabled: false, valueCelebrationThreshold: 0, valueCelebrationPriceSource: "tcgplayer",
    valueCelebrationDurationMs: 500 };
  assert.equal(lightSettingsSchema.safeParse(draft).success, true);
  for (const key of ["lightEmptyWarningSeconds", "lightBlockedWarningSeconds", "lightNormalSeconds"] as const) {
    for (const value of [0, 301, 1.5, NaN]) assert.equal(lightSettingsSchema.safeParse({ ...draft, [key]: value }).success, false);
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
