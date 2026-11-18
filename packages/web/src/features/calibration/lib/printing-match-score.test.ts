import { describe, expect, it } from "vitest";
import { printingMatchScore } from "./printing-match-score";

describe("printingMatchScore", () => {
  it("scores the closest real camera scans as 100", () => {
    expect(printingMatchScore(0, 0.4)).toBe(100);
    expect(printingMatchScore(0.1, 0.4)).toBe(100);
  });

  it("scores a median camera scan at 75 and the 75th percentile at 50", () => {
    expect(printingMatchScore(0.23, 0.4)).toBe(75);
    expect(printingMatchScore(0.3, 0.4)).toBe(50);
  });

  it("interpolates between anchors", () => {
    expect(printingMatchScore(0.35, 0.4)).toBe(25);
  });

  it("scores the acceptance threshold and anything past it as 0", () => {
    expect(printingMatchScore(0.4, 0.4)).toBe(0);
    expect(printingMatchScore(0.9, 0.4)).toBe(0);
  });

  it("scales the anchors with the threshold", () => {
    expect(printingMatchScore(0.2, 0.8)).toBe(100);
    expect(printingMatchScore(0.46, 0.8)).toBe(75);
  });

  it("never scores without a usable threshold", () => {
    expect(printingMatchScore(0.1, 0)).toBe(0);
  });
});
