import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_CALIBRATION,
  executeScanFoilNudge,
  isFirmwareFeatureSupported,
  type ScanFoilNudgeInput,
} from "@magic-vault/shared";

function fixture() {
  const commands: object[] = [];
  const input: ScanFoilNudgeInput = {
    gameKey: "mtg",
    isReady: true,
    firmwareVersion: "2.13.0",
    calibration: DEFAULT_CALIBRATION,
    firmwareLimits: { maxPulse: 18, maxTravelPercent: 40 },
    before: {
      width: 16,
      height: 16,
      data: new Uint8ClampedArray(16 * 16 * 4).fill(90),
    },
    sendCommand: async (command) => {
      commands.push(command);
      return { sent: true, line: '{"status":"ok"}' };
    },
    capture: async () => input.before,
    delay: async () => {},
  };
  return { input, commands };
}

test("nudge compares both directions and confirms neutral restoration", async () => {
  const { input, commands } = fixture();
  assert.equal((await executeScanFoilNudge(input))?.method, "nudge");
  assert.equal(commands.length, 3);
  assert.equal((commands[2] as { position: string }).position, "neutral");
});

test("unknown firmware and legacy native controller without limits cannot nudge", async () => {
  for (const version of [null, "pi-0.1.0"]) {
    const { input, commands } = fixture();
    input.firmwareVersion = version;
    if (version === "pi-0.1.0") input.firmwareLimits = null;
    assert.equal(await executeScanFoilNudge(input), null);
    assert.equal(commands.length, 0);
  }
  assert.equal(isFirmwareFeatureSupported("pi-0.1.0", "pusherNudge"), true);
});

test("stopping during motion restores without capturing or moving again", async () => {
  const { input, commands } = fixture();
  input.isActive = () => commands.length === 0;
  input.capture = async () => {
    throw new Error("unexpected capture");
  };
  assert.equal(await executeScanFoilNudge(input), null);
  assert.equal(commands.length, 2);
});

test("capture failure always restores and unconfirmed restore rejects", async () => {
  const { input, commands } = fixture();
  input.capture = async () => {
    throw new Error("camera failed");
  };
  await assert.rejects(executeScanFoilNudge(input), /camera failed/);
  assert.equal(commands.length, 2);
  input.sendCommand = async (command) => ({
    sent: true,
    line: "position" in command ? '{"status":"error"}' : '{"status":"ok"}',
  });
  await assert.rejects(executeScanFoilNudge(input), /restored to neutral/);
});

test("native controller with explicit safety limits supports nudges", async () => {
  const { input, commands } = fixture();
  input.firmwareVersion = "pi-0.1.0";
  assert.equal((await executeScanFoilNudge(input))?.method, "nudge");
  assert.equal(commands.length, 3);
});

test("missing games, forced finishes, missing calibration and invalid limits never move", async () => {
  for (const changes of [
    { gameKey: null },
    { forceFoilType: "foil" },
    { foilOnlyFoilType: "foil" },
    { calibration: null },
    {
      calibration: {
        ...DEFAULT_CALIBRATION,
        pusherLeft: 320,
        pusherRight: 340,
      },
    },
    { firmwareLimits: null },
    { firmwareVersion: "garbage" },
    { firmwareLimits: { maxPulse: NaN, maxTravelPercent: 50 } },
  ]) {
    const { input, commands } = fixture();
    Object.assign(input, changes);
    assert.equal(await executeScanFoilNudge(input), null);
    assert.equal(commands.length, 0);
  }
});

test("nudge support applies to every game, including games without the retired rainbow check", async () => {
  const { input, commands } = fixture();
  input.gameKey = "lorcana";
  assert.equal((await executeScanFoilNudge(input))?.method, "nudge");
  assert.equal(commands.length, 3);
});
