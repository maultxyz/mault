import { describe, expect, it } from "vitest";
import { CONTROL_CARD_SHEET_LAYOUT } from "@/lib/constants/control-cards";
import { BATCH_DIVIDER_SHEET_LAYOUT } from "@/lib/constants/storage-labels";
import { cardSheetGeometry } from "@/lib/card-sheet";

describe("cardSheetGeometry", () => {
  it("centers a 3 by 3 grid of bled cards on a Letter page with cut lines on each trim edge", () => {
    const geometry = cardSheetGeometry(CONTROL_CARD_SHEET_LAYOUT);
    expect(geometry.gridLeft).toBeCloseTo(10.45);
    expect(geometry.gridTop).toBeCloseTo(4.7);
    expect(geometry.trimXs.map((trimX) => Number(trimX.toFixed(2)))).toEqual([
      11.45, 74.45, 76.45, 139.45, 141.45, 204.45,
    ]);
    expect(geometry.trimYs).toHaveLength(6);
    expect(geometry.trimYs[1] - geometry.trimYs[0]).toBeCloseTo(88);
  });
});

describe("batch divider sheet", () => {
  it("fits two rows of card-width dividers on a Letter page with trim edges 63mm apart", () => {
    const geometry = cardSheetGeometry(BATCH_DIVIDER_SHEET_LAYOUT);
    expect(geometry.gridTop).toBeGreaterThan(0);
    expect(geometry.trimXs[1] - geometry.trimXs[0]).toBeCloseTo(63);
    expect(geometry.trimYs[1] - geometry.trimYs[0]).toBeCloseTo(108);
  });
});
