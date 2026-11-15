import { describe, expect, it } from "vitest";
import { printingMatchScore } from "./printing-match-score";

describe("printingMatchScore", () => {
  it("scores an exact match as 100", () => {
    expect(printingMatchScore(0, 0.4)).toBe(100);
  });

  it("scores the acceptance threshold and anything past it as 0", () => {
    expect(printingMatchScore(0.4, 0.4)).toBe(0);
    expect(printingMatchScore(0.9, 0.4)).toBe(0);
  });

  it("scales linearly between a perfect match and the threshold", () => {
    expect(printingMatchScore(0.1, 0.4)).toBe(75);
  });

  it("never scores without a usable threshold", () => {
    expect(printingMatchScore(0.1, 0)).toBe(0);
  });
});
