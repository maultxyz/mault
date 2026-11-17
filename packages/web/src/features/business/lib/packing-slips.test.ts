import { describe, expect, it } from "vitest";
import type { FulfilmentOrderDetail, OrderLine, PullSheetEntry } from "@magic-vault/shared";
import { buildPackingSlips, packingSlipSubtotal } from "./packing-slips";

const line = (overrides: Partial<OrderLine>): OrderLine => ({
  name: "Brainstorm",
  quantity: 1,
  allocations: [],
  picked: [],
  ...overrides,
});

const copy = (scanId: string, lineIndex: number, set: string, condition: "NM" | "LP" = "NM"): PullSheetEntry =>
  ({
    scanId,
    lineIndex,
    card: { name: "Brainstorm", set, collectorNumber: "61" },
    isFoil: false,
    condition,
    collectionGuid: "c",
    collectionName: "Stock",
    binNumber: null,
    locationName: null,
    locationPosition: null,
    picked: false,
    orderRef: null,
    gameKey: "mtg",
  }) as unknown as PullSheetEntry;

const order = (overrides: Partial<FulfilmentOrderDetail>): FulfilmentOrderDetail =>
  ({
    guid: "order-1",
    name: "Weekend orders",
    status: "open",
    createdAt: "2026-11-15T10:00:00.000Z",
    closedAt: null,
    lines: [],
    pullSheet: [],
    ...overrides,
  }) as FulfilmentOrderDetail;

describe("buildPackingSlips", () => {
  it("makes one slip per marketplace order and lists the copies actually allocated", () => {
    const slips = buildPackingSlips(
      order({
        lines: [
          line({ orderRef: "A-1", quantity: 2, unitPrice: 1.5, allocations: ["s1", "s2"] }),
          line({ orderRef: "B-2", name: "Opt", quantity: 3, allocations: ["s3"] }),
        ],
        pullSheet: [copy("s1", 0, "ice"), copy("s2", 0, "fca", "LP"), copy("s3", 1, "dom")],
      }),
    );
    expect(slips.map((slip) => slip.orderRef)).toEqual(["A-1", "B-2"]);
    expect(slips[0].rows.map((row) => [row.setCode, row.condition, row.quantity])).toEqual([
      ["ice", "NM", 1],
      ["fca", "LP", 1],
    ]);
    expect(packingSlipSubtotal(slips[0])).toBe(3);
    expect(slips[1].unavailable).toEqual([{ name: "Opt", quantity: 2 }]);
    expect(packingSlipSubtotal(slips[1])).toBeNull();
  });

  it("uses the picked count for fulfilled picks and skips cancelled ones", () => {
    const fulfilled = buildPackingSlips(
      order({ status: "fulfilled", lines: [line({ quantity: 2, picked: ["s1"] })] }),
    );
    expect(fulfilled[0].rows[0].quantity).toBe(1);
    expect(fulfilled[0].unavailable).toEqual([{ name: "Brainstorm", quantity: 1 }]);
    expect(buildPackingSlips(order({ status: "cancelled", lines: [line({})] }))).toEqual([]);
  });
});
