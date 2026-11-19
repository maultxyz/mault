import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MACHINE_CAMERA_REQUESTED_EVENT,
  MACHINE_COMMAND_EVENT,
  MACHINE_REMOVED_EVENT,
  MACHINE_STATUS_EVENT,
  machineBinFillFromCounts,
  machineWorkflowStep,
  type MachineStatusInput,
} from "@magic-vault/shared";
import {
  findMachineStatus,
  listMachineStatuses,
  publishMachineStatus,
  readMachineCameraFrame,
  removeMachineStatus,
  renewMachineCameraLease,
  sendMachineCommand,
  storeMachineCameraFrame,
} from "../src/lib/machine-status";
import { subscribeOrgEvents } from "../src/lib/session-stream";

function statusInput(overrides: Partial<MachineStatusInput> = {}): MachineStatusInput {
  return {
    name: "Sorter A",
    deviceGuid: null,
    collectionGuid: null,
    collectionName: null,
    runState: "running",
    attention: null,
    isEmergencyStopped: false,
    canPause: true,
    canResume: false,
    canEmergencyStop: true,
    sessionScanCount: 3,
    presetName: "A to J",
    workflowStep: null,
    binFill: null,
    hasCamera: true,
    lastCard: null,
    ...overrides,
  };
}

test("machine statuses are kept per org and announced to that org only", () => {
  const ownerEvents: string[] = [];
  const otherEvents: string[] = [];
  const unsubscribeOwner = subscribeOrgEvents("org-machines-a", (event) => ownerEvents.push(event));
  const unsubscribeOther = subscribeOrgEvents("org-machines-b", (event) => otherEvents.push(event));

  publishMachineStatus("org-machines-a", "station-1", "station", statusInput());

  assert.equal(listMachineStatuses("org-machines-a").length, 1);
  assert.equal(listMachineStatuses("org-machines-b").length, 0);
  assert.deepEqual(ownerEvents, [MACHINE_STATUS_EVENT]);
  assert.deepEqual(otherEvents, []);

  removeMachineStatus("org-machines-a", "station-1");
  assert.equal(findMachineStatus("org-machines-a", "station-1"), null);
  assert.deepEqual(ownerEvents, [MACHINE_STATUS_EVENT, MACHINE_REMOVED_EVENT]);
  unsubscribeOwner();
  unsubscribeOther();
});

test("machines needing attention sort before running and idle machines", () => {
  publishMachineStatus("org-machines-sort", "idle", "station", statusInput({ name: "A", runState: "idle" }));
  publishMachineStatus("org-machines-sort", "running", "station", statusInput({ name: "B" }));
  publishMachineStatus(
    "org-machines-sort",
    "attention",
    "station",
    statusInput({ name: "C", runState: "attention", attention: { kind: "jam", module: 2 } }),
  );

  assert.deepEqual(
    listMachineStatuses("org-machines-sort").map((machine) => machine.machineId),
    ["attention", "running", "idle"],
  );
});

test("commands are relayed to the org with a unique id", () => {
  const events: { event: string; data: unknown }[] = [];
  const unsubscribe = subscribeOrgEvents("org-machines-command", (event, data) => events.push({ event, data }));

  const first = sendMachineCommand("org-machines-command", "station-1", "pause");
  const second = sendMachineCommand("org-machines-command", "station-1", "pause");

  assert.notEqual(first.commandId, second.commandId);
  assert.equal(events[0]?.event, MACHINE_COMMAND_EVENT);
  assert.deepEqual(events[0]?.data, first);
  unsubscribe();
});

test("camera frames are requested once while watched and stop when nobody watches", () => {
  const events: string[] = [];
  const unsubscribe = subscribeOrgEvents("org-machines-camera", (event) => events.push(event));
  publishMachineStatus("org-machines-camera", "station-1", "station", statusInput());

  assert.deepEqual(storeMachineCameraFrame("org-machines-camera", "station-1", Buffer.from([1])), {
    stored: true,
    keepSending: false,
  });

  renewMachineCameraLease("org-machines-camera", "station-1");
  assert.equal(events.filter((event) => event === MACHINE_CAMERA_REQUESTED_EVENT).length, 1);

  assert.deepEqual(storeMachineCameraFrame("org-machines-camera", "station-1", Buffer.from([2])), {
    stored: true,
    keepSending: true,
  });
  renewMachineCameraLease("org-machines-camera", "station-1");
  assert.equal(events.filter((event) => event === MACHINE_CAMERA_REQUESTED_EVENT).length, 1);
  assert.deepEqual(readMachineCameraFrame("org-machines-camera", "station-1")?.bytes, Buffer.from([2]));
  assert.deepEqual(storeMachineCameraFrame("org-machines-camera", "unknown", Buffer.from([3])), {
    stored: false,
    keepSending: false,
  });
  unsubscribe();
});

test("bin fill skips disabled bins and lists the catch-all last", () => {
  const fill = machineBinFillFromCounts(
    [
      { binNumber: 3, isCatchAll: true },
      { binNumber: 2, isDisabled: true },
      { binNumber: 1 },
    ],
    (binNumber) => binNumber * 10,
    (binNumber) => (binNumber === 3 ? null : 300),
  );

  assert.deepEqual(fill, [
    { binNumber: 1, count: 10, capacity: 300, isCatchAll: false },
    { binNumber: 3, count: 30, capacity: null, isCatchAll: true },
  ]);
});

test("the workflow step reports the active pass of the game's active workflow", () => {
  const step = machineWorkflowStep(
    [
      {
        guid: "workflow",
        name: "Alphabet",
        gameGuid: "game",
        isActive: true,
        activeStepGuid: "second",
        steps: [
          { guid: "third", position: 3, presetGuid: "p3", isResortMode: false },
          { guid: "first", position: 1, presetGuid: "p1", isResortMode: false },
          { guid: "second", position: 2, presetGuid: "p2", isResortMode: false },
        ],
      },
    ],
    "game",
  );

  assert.deepEqual(step, { workflowName: "Alphabet", position: 2, stepCount: 3 });
  assert.equal(machineWorkflowStep([], "game"), null);
});
