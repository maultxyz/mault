import { describe, expect, it } from "vitest";
import { customDividerTexts, planBatchDividers } from "./batch-dividers";

const location = (guid: string, capacity: number | null, batchSize: number | null) => ({
  guid,
  name: guid.toUpperCase(),
  capacity,
  batchSize,
});

describe("planBatchDividers", () => {
  it("makes one divider per batch with the batch's first and last slot", () => {
    const plan = planBatchDividers([location("a1", 120, 50)] as never);
    expect(
      plan.dividers.map((divider) =>
        divider.kind === "batch" ? [divider.batch, divider.firstSlot, divider.lastSlot] : null,
      ),
    ).toEqual([
      [1, "1-1", "1-50"],
      [2, "2-1", "2-50"],
      [3, "3-1", "3-20"],
    ]);
    expect(plan.totalDividers).toBe(3);
    expect(plan.skippedLocationNames).toEqual([]);
  });

  it("skips batch dividers for locations without a capacity or batch size", () => {
    const plan = planBatchDividers([location("a1", null, 50), location("a2", 100, null)] as never);
    expect(plan.dividers).toEqual([]);
    expect(plan.skippedLocationNames).toEqual(["A1", "A2"]);
  });

  it("stops at the divider limit but still counts every divider", () => {
    const plan = planBatchDividers([location("a1", 100, 10), location("a2", 100, 10)] as never, "", 15);
    expect(plan.dividers).toHaveLength(15);
    expect(plan.totalDividers).toBe(20);
  });

  it("prints each custom divider for every selected location, before its batches", () => {
    const plan = planBatchDividers(
      [location("a1", null, null), location("a2", 20, 10)] as never,
      " Commons \n\nRares\r\n",
    );
    expect(
      plan.dividers.map((divider) =>
        divider.kind === "custom"
          ? `${divider.locationName}: ${divider.text}`
          : `${divider.locationName}: batch ${divider.batch}`,
      ),
    ).toEqual([
      "A1: Commons",
      "A1: Rares",
      "A2: Commons",
      "A2: Rares",
      "A2: batch 1",
      "A2: batch 2",
    ]);
    expect(plan.skippedLocationNames).toEqual(["A1"]);
  });

  it("prints custom dividers without a location when none is selected", () => {
    const plan = planBatchDividers([], "Commons");
    expect(plan.dividers).toEqual([
      { kind: "custom", key: "custom-custom-0", text: "Commons", locationName: null },
    ]);
  });

  it("reads one custom divider per non-empty line", () => {
    expect(customDividerTexts("  \nA\r\n B \n")).toEqual(["A", "B"]);
  });
});
