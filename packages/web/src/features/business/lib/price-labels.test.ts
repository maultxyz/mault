import { describe, expect, it } from "vitest";
import type { PriceLabelCard } from "@magic-vault/shared";
import { buildPriceLabelItems, toPriceLabelSource } from "./price-labels";

const card = (scanId: string, sellPrice: number | null): PriceLabelCard => ({
  scanId,
  name: "Card",
  setName: "Set",
  setCode: "set",
  collectorNumber: "1",
  isFoil: false,
  foilType: null,
  condition: "NM",
  language: null,
  marketPrice: sellPrice,
  sellPrice,
});

describe("buildPriceLabelItems", () => {
  it("prints the sell price unless a custom price is set", () => {
    const items = buildPriceLabelItems(
      [card("a", 2.99), card("b", 2), card("c", null)],
      { b: 5 },
    );
    expect(items.map((item) => [item.labelPrice, item.hasCustomPrice])).toEqual([
      [2.99, false],
      [5, true],
      [null, false],
    ]);
  });
});

describe("toPriceLabelSource", () => {
  it("accepts known sources only", () => {
    expect(toPriceLabelSource("lot")).toBe("lot");
    expect(toPriceLabelSource("nope")).toBeNull();
    expect(toPriceLabelSource(null)).toBeNull();
  });
});
