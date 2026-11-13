import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_CALIBRATION, executeScanFoilNudge, type ScanFoilNudgeInput } from "@magic-vault/shared";
import { applyPiScanNudgeCalibration, hasConfirmedPiScanNudgeCalibration } from "../src/lib/pi-scan/configure";

test("a stale controller calibration cannot nudge before configuration acknowledgment", async () => {
  const commands: object[] = [];
  const configure = async (payload: object) => {
    commands.push(payload);
    return { status: "error" };
  };
  const input: ScanFoilNudgeInput = {
    gameKey: "mtg", isReady: true, firmwareVersion: "2.13.0",
    calibration: DEFAULT_CALIBRATION, firmwareLimits: { maxPulse: 20, maxTravelPercent: 50 },
    before: { width: 1, height: 1, data: new Uint8ClampedArray(4) },
    prepareMotion: () => applyPiScanNudgeCalibration(configure, DEFAULT_CALIBRATION),
    sendCommand: async (payload) => { commands.push(payload); return { sent: true, line: '{"status":"ok"}' }; },
    capture: async () => null, delay: async () => {},
  };
  await assert.rejects(executeScanFoilNudge(input), /confirm.*calibration/);
  assert.equal(commands.length, 1);
  assert.deepEqual(commands[0], { setConfig: { module: 1, ...DEFAULT_CALIBRATION } });
  commands.length = 0;
  input.prepareMotion = () => applyPiScanNudgeCalibration(async (payload) => { commands.push(payload); return { status: "ok" }; }, DEFAULT_CALIBRATION);
  await executeScanFoilNudge(input);
  assert.equal(commands.length, 4);
  assert.ok("setConfig" in commands[0]);
  assert.equal((commands[3] as { position: string }).position, "neutral");
});


test("held card calibration must match the snapshot acknowledged before neutral and feeding", () => {
  assert.equal(hasConfirmedPiScanNudgeCalibration(DEFAULT_CALIBRATION, null), false);
  assert.equal(hasConfirmedPiScanNudgeCalibration(DEFAULT_CALIBRATION, { ...DEFAULT_CALIBRATION }), true);
  assert.equal(hasConfirmedPiScanNudgeCalibration({ ...DEFAULT_CALIBRATION, pusherNeutral: 320 }, DEFAULT_CALIBRATION), false);
  assert.equal(hasConfirmedPiScanNudgeCalibration({ ...DEFAULT_CALIBRATION, pusherRight: 400 }, DEFAULT_CALIBRATION), false);
});
