import { describe, expect, it } from "vitest";
import type { QuarterTurns } from "@/lib/interfaces/scanner";
import { normalizedCorrelation, quarterTurnsMatchingReference } from "./scan-page-card-image";

const upright = [10, 20, 30, 40, 50, 60];
const upsideDown = [...upright].reverse();

describe("normalizedCorrelation", () => {
  it("is 1 for identical images and -1 for inverted ones", () => {
    expect(normalizedCorrelation(upright, upright)).toBeCloseTo(1);
    expect(normalizedCorrelation(upright, upright.map((value) => 100 - value))).toBeCloseTo(-1);
  });
});

describe("quarterTurnsMatchingReference", () => {
  const samplesOfUpsideDownPage = (quarterTurns: QuarterTurns) =>
    quarterTurns === 2 ? upright : upsideDown;

  it("turns an upside down page to match the matched card", () => {
    expect(quarterTurnsMatchingReference(samplesOfUpsideDownPage, upright, true, true)).toBe(2);
  });

  it("leaves a page that already matches as it is", () => {
    expect(quarterTurnsMatchingReference(samplesOfUpsideDownPage, upsideDown, true, true)).toBe(0);
  });

  it("only tries sideways turns when the page and the card differ in shape", () => {
    const sampledTurns: QuarterTurns[] = [];
    quarterTurnsMatchingReference(
      (quarterTurns) => {
        sampledTurns.push(quarterTurns);
        return upright;
      },
      upright,
      false,
      true,
    );
    expect(new Set(sampledTurns)).toEqual(new Set([1, 3]));
  });
});
