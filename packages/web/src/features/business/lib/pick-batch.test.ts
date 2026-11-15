import { describe, expect, it } from "vitest";
import type { FulfilmentOrderDetail, PullSheetEntry } from "@magic-vault/shared";
import { buildBatchPullSheet, fullyPickedOrders } from "./pick-batch";

const entry = (scanId: string, locationName: string | null, locationPosition: number): PullSheetEntry =>
  ({
    scanId,
    lineIndex: 0,
    card: { name: scanId },
    locationName,
    locationPosition,
    collectionName: "Stock",
    binNumber: null,
  }) as unknown as PullSheetEntry;

const order = (guid: string, status: string, pullSheet: PullSheetEntry[]): FulfilmentOrderDetail =>
  ({ guid, name: guid, status, pullSheet }) as unknown as FulfilmentOrderDetail;

describe("buildBatchPullSheet", () => {
  it("walks every open pick's cards in storage order with unlocated cards last", () => {
    const sheet = buildBatchPullSheet([
      order("a", "open", [entry("a1", "Box 2", 4), entry("a2", null, 0)]),
      order("b", "open", [entry("b1", "Box 2", 1), entry("b2", "Box 10", 0)]),
      order("c", "fulfilled", [entry("c1", "Box 1", 0)]),
    ]);
    expect(sheet.map((item) => [item.scanId, item.orderGuid])).toEqual([
      ["b1", "b"],
      ["a1", "a"],
      ["b2", "b"],
      ["a2", "a"],
    ]);
  });
});

describe("fullyPickedOrders", () => {
  it("returns open picks whose every card is picked", () => {
    const orders = [
      order("a", "open", [entry("a1", "Box", 0), entry("a2", "Box", 1)]),
      order("b", "open", [entry("b1", "Box", 2)]),
      order("c", "open", []),
    ];
    expect(fullyPickedOrders(orders, new Set(["a1", "b1"])).map((item) => item.guid)).toEqual(["b"]);
  });
});
