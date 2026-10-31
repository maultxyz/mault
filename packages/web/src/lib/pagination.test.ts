import { describe, expect, it } from "vitest";
import { clampPage, pageSpread } from "@/lib/pagination";

describe("pageSpread", () => {
  it("lists every page when they all fit", () => {
    expect(pageSpread(2, 7, 1)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("collapses the far end near the start", () => {
    expect(pageSpread(4, 20, 1)).toEqual([1, 2, 3, 4, 5, "end-ellipsis", 20]);
  });

  it("collapses both ends in the middle", () => {
    expect(pageSpread(10, 20, 1)).toEqual([
      1,
      "start-ellipsis",
      9,
      10,
      11,
      "end-ellipsis",
      20,
    ]);
  });

  it("collapses the near end close to the last page", () => {
    expect(pageSpread(18, 20, 1)).toEqual([
      1,
      "start-ellipsis",
      16,
      17,
      18,
      19,
      20,
    ]);
  });

  it("shows only the current page between the ends when compact", () => {
    expect(pageSpread(8, 20, 0)).toEqual([
      1,
      "start-ellipsis",
      8,
      "end-ellipsis",
      20,
    ]);
  });
});

describe("clampPage", () => {
  it("keeps the page inside the page count", () => {
    expect(clampPage(0, 5)).toBe(1);
    expect(clampPage(9, 5)).toBe(5);
    expect(clampPage(3.4, 5)).toBe(3);
  });
});
