import { describe, expect, it } from "vitest";
import { encodeCode128 } from "./code128";
import { CODE128_QUIET_ZONE_MODULES } from "./constants/code128";

const REFERENCE_SKU = "MTG-M10-146-EN-F-NM-K7Q2";
const REFERENCE_MODULES =
  "11010010000101110110001101110001011010001000100110111001011101100010011100110100111011001001101110010011100110110010011101100111010010011011100100011010001011100011010011011100100011000101001101110010111000110101110110001001101110010110001110111011011101101000111011001110010110111001001100011101011";

function toModules(text: string): string {
  const { bars, totalModules } = encodeCode128(text);
  const modules = Array<string>(totalModules - CODE128_QUIET_ZONE_MODULES * 2).fill("0");
  for (const bar of bars) {
    for (let offset = 0; offset < bar.width; offset++) {
      modules[bar.x - CODE128_QUIET_ZONE_MODULES + offset] = "1";
    }
  }
  return modules.join("");
}

describe("encodeCode128", () => {
  it("matches a reference Code 128 B encoding", () => {
    expect(toModules(REFERENCE_SKU)).toBe(REFERENCE_MODULES);
  });

  it("refuses characters outside set B", () => {
    expect(() => encodeCode128("é")).toThrow();
  });
});
