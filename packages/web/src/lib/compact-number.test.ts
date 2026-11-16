import {
  formatCompactNumber,
  formatCompactPriceInCurrency,
  isCompactNumber,
} from "@magic-vault/shared";
import { describe, expect, it } from "vitest";

describe("formatCompactNumber", () => {
  it("keeps values below a thousand exact", () => {
    expect(formatCompactNumber(0, "en")).toBe("0");
    expect(formatCompactNumber(999, "en")).toBe("999");
  });

  it("shortens thousands, millions and billions", () => {
    expect(formatCompactNumber(1000, "en")).toBe("1k");
    expect(formatCompactNumber(1500, "en")).toBe("1.5k");
    expect(formatCompactNumber(10_000, "en")).toBe("10k");
    expect(formatCompactNumber(12_345, "en")).toBe("12.3k");
    expect(formatCompactNumber(123_456, "en")).toBe("123k");
    expect(formatCompactNumber(2_500_000, "en")).toBe("2.5M");
    expect(formatCompactNumber(3_200_000_000, "en")).toBe("3.2B");
  });

  it("moves to the next unit instead of showing 1000k", () => {
    expect(formatCompactNumber(999_950, "en")).toBe("1M");
    expect(formatCompactNumber(999_499, "en")).toBe("999k");
  });

  it("keeps the sign and the locale's decimal separator", () => {
    expect(formatCompactNumber(-1500, "en")).toBe("-1.5k");
    expect(formatCompactNumber(1500, "de")).toBe("1,5k");
  });
});

describe("formatCompactPriceInCurrency", () => {
  it("keeps exact prices below a thousand", () => {
    expect(formatCompactPriceInCurrency(12.5, "USD")).toBe("$12.50 USD");
  });

  it("shortens large prices", () => {
    expect(formatCompactPriceInCurrency(15_432.1, "USD")).toBe("$15.4k USD");
    expect(formatCompactPriceInCurrency(-2500, "EUR")).toBe("-€2.5k EUR");
  });
});

describe("isCompactNumber", () => {
  it("is true from a thousand", () => {
    expect(isCompactNumber(999)).toBe(false);
    expect(isCompactNumber(1000)).toBe(true);
    expect(isCompactNumber(-1000)).toBe(true);
  });
});
