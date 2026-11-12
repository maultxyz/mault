import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_CALIBRATION,
  DEFAULT_FEEDER_CALIBRATION,
} from "@magic-vault/shared";
import { configurePiScanSorter } from "../src/lib/pi-scan/configure";

const configuration = {
  channelOffset: 4,
  moduleCalibrations: [1, 2].map((moduleNumber) => ({
    moduleNumber,
    calibration: { ...DEFAULT_CALIBRATION, pusherNeutral: 300 + moduleNumber },
  })),
  feederCalibration: { ...DEFAULT_FEEDER_CALIBRATION, speed: 399 },
};

test("host startup synchronizes saved layout, all actual modules, and feeder before any positioning or feeding", async () => {
  const commands: object[] = [];
  await configurePiScanSorter(async (command) => {
    commands.push(command);
    return { status: "ok" };
  }, configuration);
  assert.deepEqual(commands, [
    { setChannelOffset: 4 },
    ...configuration.moduleCalibrations.map((module) => ({
      setConfig: { module: module.moduleNumber, ...module.calibration },
    })),
    { setFeederConfig: configuration.feederCalibration },
  ]);
  assert.ok(
    commands.every(
      (command) =>
        !("neutral" in command) &&
        !("feeder" in command) &&
        !("storeConfig" in command),
    ),
  );
});

test("host startup sends no invented module or feeder defaults when saved rows are absent", async () => {
  const commands: object[] = [];
  await configurePiScanSorter(
    async (command) => {
      commands.push(command);
      return { status: "ok" };
    },
    { channelOffset: 0, moduleCalibrations: [], feederCalibration: null },
  );
  assert.deepEqual(commands, [{ setChannelOffset: 0 }]);
});

for (const failedAt of [0, 1, 2, 3]) {
  test(`unconfirmed configuration ${failedAt} stops startup before later commands`, async () => {
    let sent = 0;
    await assert.rejects(
      configurePiScanSorter(async () => {
        const current = sent++;
        return current === failedAt
          ? { error: "configuration rejected" }
          : { status: "ok" };
      }, configuration),
      /did not confirm/,
    );
    assert.equal(sent, failedAt + 1);
  });
}
