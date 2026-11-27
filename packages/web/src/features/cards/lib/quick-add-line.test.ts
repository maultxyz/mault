import { describe, expect, it } from "vitest";
import { parseQuickAddLine } from "@/features/cards/lib/quick-add-line";

describe("parseQuickAddLine", () => {
  it("reads a plain card name", () => {
    expect(parseQuickAddLine("  Lightning Bolt ")).toEqual({
      quantity: 1,
      cardName: "Lightning Bolt",
      isFoil: false,
    });
  });

  it("reads quantity, set, collector number and foil", () => {
    expect(parseQuickAddLine("4x Lightning Bolt (M10) 146 *F*")).toEqual({
      quantity: 4,
      cardName: "Lightning Bolt",
      setCode: "m10",
      collectorNumber: "146",
      isFoil: true,
    });
  });

  it("accepts a bare quantity and square brackets", () => {
    expect(parseQuickAddLine("2 Counterspell [mh2]")).toEqual({
      quantity: 2,
      cardName: "Counterspell",
      setCode: "mh2",
      collectorNumber: undefined,
      isFoil: false,
    });
  });

  it("keeps a leading number that is too large to be a quantity", () => {
    expect(parseQuickAddLine("1996 World Champion").cardName).toBe(
      "1996 World Champion",
    );
  });

  it("reads foil markers anywhere in the line", () => {
    const parsed = parseQuickAddLine("*foil* Sol Ring");
    expect(parsed.isFoil).toBe(true);
    expect(parsed.cardName).toBe("Sol Ring");
  });
});
