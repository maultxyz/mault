import assert from "node:assert/strict";
import { test } from "node:test";
import {
  earlyRouteBinOf,
  prepareMatchedScanPlan,
  runScanWorkflow,
  type BinConfig,
  type BinSet,
  type PlayingCardWithDistance,
  type ScanPlanContext,
  type ScanWorkflowAdapter,
} from "@magic-vault/shared";

type Outcome = PlayingCardWithDistance | null;

const imageCard = { id: "image-card" } as PlayingCardWithDistance;
const textCard = { id: "text-card" } as PlayingCardWithDistance;

function workflow(overrides: Partial<ScanWorkflowAdapter<string, Outcome>>) {
  const events: string[] = [];
  const delivered: Outcome[] = [];
  const adapter: ScanWorkflowAdapter<string, Outcome> = {
    controlStage: "before-identify",
    capture: async () => {
      events.push("capture");
      return "frame";
    },
    readControl: () => null,
    applyControl: (command) => {
      events.push(command ? "control-valid" : "control-invalid");
    },
    identify: async (_frame, offerEarlyRoute) => {
      events.push("identify");
      offerEarlyRoute(imageCard);
      await Promise.resolve();
      return textCard;
    },
    routeEarly: () => {
      events.push("route-early");
      return true;
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
    matched: (outcome) => {
      delivered.push(outcome);
      events.push("matched");
    },
    unmatched: () => {
      events.push("unmatched");
    },
    ...overrides,
  };
  return { events, delivered, run: () => runScanWorkflow(adapter) };
}

function nextTurn() {
  return new Promise<void>((resolve) => setImmediate(resolve));
}

test("a control read during identification still wins and drops the identification", async () => {
  let finishIdentify = () => {};
  const scan = workflow({
    controlStage: "during-identify",
    readControl: () => "mault-control:invalid",
    routeEarly: undefined,
    identify: async () => {
      scan.events.push("identify");
      await new Promise<void>((resolve) => {
        finishIdentify = resolve;
      });
      return imageCard;
    },
  });
  assert.equal(await scan.run(), "control");
  finishIdentify();
  await nextTurn();
  assert.deepEqual(scan.events, ["capture", "identify", "control-invalid"]);
});

test("identification overlaps the control read and continues when no control card is found", async () => {
  const scan = workflow({
    controlStage: "during-identify",
    routeEarly: undefined,
    readControl: async () => {
      scan.events.push("control-read");
      await Promise.resolve();
      scan.events.push("control-clear");
      return null;
    },
  });
  assert.equal(await scan.run(), "matched");
  assert.deepEqual(scan.events, [
    "capture",
    "identify",
    "control-read",
    "control-clear",
    "foil",
    "matched",
  ]);
});

test("a failed identification during the control read still fails the scan", async () => {
  const scan = workflow({
    controlStage: "during-identify",
    identify: async () => {
      throw Error("identify failed");
    },
  });
  await assert.rejects(scan.run(), /identify failed/);
});

test("an early route commits the scan: no stop, duplicate or foil stage runs before it is delivered", async () => {
  let checks = 0;
  const scan = workflow({
    checkpoint: async () => ++checks <= 2,
    isDuplicate: (card) => card.id === textCard.id,
  });
  assert.equal(await scan.run(), "matched");
  assert.deepEqual(scan.events, [
    "capture",
    "identify",
    "route-early",
    "matched",
  ]);
  assert.deepEqual(scan.delivered, [textCard]);
});

test("an early-routed scan is delivered from the image match when identification fails or loses the card", async () => {
  for (const finish of [
    async (): Promise<Outcome> => {
      throw Error("text search failed");
    },
    async (): Promise<Outcome> => null,
  ]) {
    const scan = workflow({
      identify: async (_frame, offerEarlyRoute) => {
        offerEarlyRoute(imageCard);
        await Promise.resolve();
        return finish();
      },
    });
    assert.equal(await scan.run(), "matched");
    assert.deepEqual(scan.delivered, [imageCard]);
  }
});

test("removal, a duplicate image match and a declined route never route early", async () => {
  for (const overrides of [
    { isRemoval: () => true },
    { isDuplicate: () => true },
  ]) {
    const scan = workflow(overrides);
    await scan.run();
    assert.ok(!scan.events.includes("route-early"));
  }
  const declined = workflow({ routeEarly: () => false });
  assert.equal(await declined.run(), "matched");
  assert.deepEqual(declined.events, ["capture", "identify", "foil", "matched"]);
  assert.deepEqual(declined.delivered, [textCard]);
});

test("an offer made after identification finished is ignored", async () => {
  let lateOffer: (provisional: Outcome) => void = () => {};
  const scan = workflow({
    identify: async (_frame, offerEarlyRoute) => {
      lateOffer = offerEarlyRoute;
      return textCard;
    },
  });
  assert.equal(await scan.run(), "matched");
  lateOffer(imageCard);
  assert.ok(!scan.events.includes("route-early"));
});

test("an early route offered during the control read waits until no control card is found", async () => {
  let releaseControl: (text: string | null) => void = () => {};
  let finishIdentify = () => {};
  const scan = workflow({
    controlStage: "during-identify",
    readControl: () =>
      new Promise<string | null>((resolve) => {
        releaseControl = resolve;
      }),
    identify: async (_frame, offerEarlyRoute) => {
      scan.events.push("identify");
      offerEarlyRoute(imageCard);
      scan.events.push("offered");
      await new Promise<void>((resolve) => {
        finishIdentify = resolve;
      });
      return textCard;
    },
  });
  const running = scan.run();
  await nextTurn();
  assert.ok(!scan.events.includes("route-early"));
  releaseControl(null);
  await nextTurn();
  assert.ok(scan.events.includes("route-early"));
  finishIdentify();
  assert.equal(await running, "matched");
  assert.deepEqual(scan.events, [
    "capture",
    "identify",
    "offered",
    "route-early",
    "matched",
  ]);
});

test("a control card found during identification never routes the offered card early", async () => {
  const scan = workflow({
    controlStage: "during-identify",
    readControl: async () => "mault-control:invalid",
  });
  assert.equal(await scan.run(), "control");
  await nextTurn();
  assert.ok(!scan.events.includes("route-early"));
  assert.ok(!scan.events.includes("matched"));
});

const rules = { id: "rules", combinator: "and" as const, conditions: [] };
const redBin: BinConfig = {
  guid: "red",
  binNumber: 1,
  isCatchAll: false,
  rules: {
    id: "red-rules",
    combinator: "and",
    conditions: [
      { id: "red", field: "color", operator: "equals", value: "red" },
    ],
  },
} as BinConfig;
const catchAll: BinConfig = {
  guid: "rest",
  binNumber: 2,
  isCatchAll: true,
  rules,
};

function planContext(extra: Partial<ScanPlanContext> = {}): ScanPlanContext {
  return {
    binSet: {} as BinSet,
    configs: [redBin, catchAll],
    fieldDefinitions: [
      {
        field: "color",
        path: "color",
        label: "Color",
        type: "string",
        operators: [],
      },
    ],
    binContents: [],
    countCardsInBin: () => 0,
    isBinFull: () => false,
    binRoom: () => 10,
    createRuleId: () => "new-rule",
    ...extra,
  } as ScanPlanContext;
}

function printing(id: string, color: string, extra: object = {}) {
  return {
    id,
    name: "Lightning Bolt",
    color,
    distance: 0.2,
    ...extra,
  } as unknown as PlayingCardWithDistance;
}

function planFor(
  card: PlayingCardWithDistance,
  context = planContext(),
  routedBin?: BinConfig,
) {
  return prepareMatchedScanPlan(
    {
      scanId: "scan",
      scannedAt: 1,
      card,
      sessionFoilType: null,
      fallbackFoilTypes: [],
    },
    context,
    routedBin,
  );
}

test("candidates that all route to one bin can be routed before the text match", () => {
  const plans = [planFor(printing("a", "red")), planFor(printing("b", "red"))];
  assert.equal(plans[0].action, "route");
  assert.equal(plans[0].bin?.binNumber, 1);
  assert.equal(earlyRouteBinOf(plans)?.binNumber, 1);
});

test("candidates that route to different bins wait for the text match", () => {
  assert.equal(
    earlyRouteBinOf([
      planFor(printing("a", "red")),
      planFor(printing("b", "blue")),
    ]),
    null,
  );
});

test("a paused candidate, a stamped candidate or no candidate never routes early", () => {
  const full = planContext({ isBinFull: (binNumber) => binNumber === 1 });
  assert.equal(planFor(printing("a", "red"), full).action, "pause");
  assert.equal(
    earlyRouteBinOf([
      planFor(printing("a", "red"), full),
      planFor(printing("b", "red"), full),
    ]),
    null,
  );
  assert.equal(
    earlyRouteBinOf([
      planFor(printing("a", "red")),
      planFor(printing("b", "red", { stamps: ["1st-edition"] })),
    ]),
    null,
  );
  assert.equal(earlyRouteBinOf([]), null);
});

test("a final card that belongs in the routed bin keeps its ordinary plan", () => {
  const plan = planFor(printing("c", "red"), planContext(), redBin);
  assert.equal(plan.action, "route");
  assert.equal(plan.record.binNumber, 1);
  assert.equal(plan.record.lowConfidenceMatch, undefined);
});

test("a final card that belongs elsewhere is recorded in the bin it was routed to and flagged for review", () => {
  const elsewhere = planFor(printing("c", "blue"));
  assert.equal(elsewhere.record.binNumber, 2);
  const pinned = planFor(printing("c", "blue"), planContext(), redBin);
  assert.equal(pinned.action, "route");
  assert.equal(pinned.bin?.binNumber, 1);
  assert.equal(pinned.record.binNumber, 1);
  assert.equal(pinned.binContent?.binNumber, 1);
  assert.equal(pinned.record.lowConfidenceMatch, true);
  assert.equal(pinned.pickListUpdate, null);
});

test("a full routed bin never turns an already routed card into a pause", () => {
  const full = planContext({ isBinFull: (binNumber) => binNumber === 1 });
  const pinned = planFor(printing("c", "red"), full, redBin);
  assert.equal(pinned.action, "route");
  assert.equal(pinned.record.binNumber, 1);
  assert.equal(pinned.record.lowConfidenceMatch, undefined);
});
