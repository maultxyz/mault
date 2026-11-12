import assert from "node:assert/strict";
import { test } from "node:test";
import {
  runScanWorkflow,
  runScanDisposition,
  type ScanWorkflowAdapter,
  type PlayingCardWithDistance,
} from "@magic-vault/shared";

function workflow(
  overrides: Partial<
    ScanWorkflowAdapter<string, PlayingCardWithDistance | null>
  > = {},
) {
  const events: string[] = [];
  const card = { id: "card" } as PlayingCardWithDistance;
  const adapter: ScanWorkflowAdapter<string, PlayingCardWithDistance | null> = {
    controlStage: "before-identify",
    capture: async () => {
      events.push("capture");
      return "frame";
    },
    readControl: () => {
      events.push("control-read");
      return null;
    },
    applyControl: (command) => {
      events.push(command ? "control-valid" : "control-invalid");
    },
    identify: async () => {
      events.push("identify");
      return card;
    },
    card: (outcome) => outcome,
    isRemoval: () => false,
    remove: () => {
      events.push("remove");
    },
    isDuplicate: () => false,
    duplicate: () => {
      events.push("duplicate");
    },
    refineFoil: async (outcome) => {
      events.push("foil");
      return outcome;
    },
    matched: () => {
      events.push("matched");
    },
    unmatched: () => {
      events.push("unmatched");
    },
    ...overrides,
  };
  return { events, run: () => runScanWorkflow(adapter) };
}

test("control cards bypass identification, including invalid control commands", async () => {
  const scan = workflow({ readControl: () => "mault-control:invalid" });
  assert.equal(await scan.run(), "control");
  assert.deepEqual(scan.events, ["capture", "control-invalid"]);
});

test("ordinary QR codes continue through identify and foil refinement", async () => {
  const scan = workflow({ readControl: () => "https://example.com" });
  assert.equal(await scan.run(), "matched");
  assert.deepEqual(scan.events, ["capture", "identify", "foil", "matched"]);
});

test("a surface can handle a share QR without falling through to unmatched saving", async () => {
  const scan = workflow({
    readControl: () => "https://example.com/share",
    applyOtherCode: () => true,
  });
  assert.equal(await scan.run(), "control");
  assert.deepEqual(scan.events, ["capture"]);
});

test("removal bypasses duplicate and foil stages for matches and misses", async () => {
  for (const miss of [false, true]) {
    const scan = workflow({
      isRemoval: () => true,
      isDuplicate: () => {
        throw Error("duplicate checked");
      },
      ...(miss ? { identify: async () => null } : {}),
    });
    assert.equal(await scan.run(), "removal");
    assert.equal(scan.events.at(-1), "remove");
    assert.ok(!scan.events.includes("foil"));
  }
});

test("duplicate matches bypass foil and saving", async () => {
  const scan = workflow({ isDuplicate: () => true });
  assert.equal(await scan.run(), "duplicate");
  assert.deepEqual(scan.events, [
    "capture",
    "control-read",
    "identify",
    "duplicate",
  ]);
});

test("after-miss control reads happen only after unsuccessful identification", async () => {
  const match = workflow({ controlStage: "after-miss" });
  assert.equal(await match.run(), "matched");
  assert.ok(!match.events.includes("control-read"));
  const miss = workflow({
    controlStage: "after-miss",
    identify: async () => null,
  });
  assert.equal(await miss.run(), "unmatched");
  assert.deepEqual(miss.events, ["capture", "control-read", "unmatched"]);
});

test("stop after asynchronous foil refinement prevents saving", async () => {
  let active = true;
  const scan = workflow({
    checkpoint: async () => active,
    refineFoil: async (outcome) => {
      active = false;
      return outcome;
    },
  });
  assert.equal(await scan.run(), "stopped");
  assert.ok(!scan.events.includes("matched"));
});

test("disposition prepares again after a hold and persists a routed card after stopping", async () => {
  const events: string[] = [];
  let active = true;
  let prepared = 0;
  const result = await runScanDisposition({
    prepare: () => ({
      action: ++prepared === 1 ? ("pause" as const) : ("route" as const),
    }),
    hold: async () => {
      events.push("hold");
      return true;
    },
    assign: () => {
      events.push("assign");
    },
    pick: () => {
      events.push("pick");
    },
    route: () => {
      events.push("route");
      active = false;
    },
    persist: () => {
      events.push("persist");
    },
    complete: () => {
      events.push("complete");
    },
    checkpoint: async () => active,
  });
  assert.equal(result, "complete");
  assert.equal(prepared, 2);
  assert.deepEqual(events, [
    "hold",
    "assign",
    "pick",
    "route",
    "persist",
    "complete",
  ]);
});

test("a configuration change during assignment replans before routing and saving", async () => {
  let revision = 0;
  const assigned: number[] = [];
  const routed: number[] = [];
  const persisted: number[] = [];
  const result = await runScanDisposition({
    revision: () => revision,
    prepare: () => ({ action: "route" as const, binNumber: revision + 1 }),
    hold: async () => false,
    assign: async (plan) => {
      assigned.push(plan.binNumber);
      if (revision === 0) revision++;
    },
    checkpoint: async () => true,
    pick: () => {},
    route: (plan) => {
      routed.push(plan.binNumber);
    },
    persist: (plan) => {
      persisted.push(plan.binNumber);
    },
    complete: () => {},
  });
  assert.equal(result, "complete");
  assert.deepEqual(assigned, [1, 2]);
  assert.deepEqual(routed, [2]);
  assert.deepEqual(persisted, [2]);
});
