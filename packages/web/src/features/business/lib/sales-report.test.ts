import { describe, expect, it } from "vitest";
import {
  salesMarginPercent,
  salesReportFiltersFrom,
} from "@/features/business/lib/sales-report";

const TODAY = new Date(2026, 10, 22);

describe("salesReportFiltersFrom", () => {
  it("defaults to the last 30 days without a buy", () => {
    expect(salesReportFiltersFrom(new URLSearchParams(), TODAY)).toEqual({
      from: "2026-10-24",
      to: "2026-11-22",
      buyGuid: null,
    });
  });

  it("leaves the range open when filtering by a buy", () => {
    expect(salesReportFiltersFrom(new URLSearchParams("buy=abc"), TODAY)).toEqual({
      from: "",
      to: "",
      buyGuid: "abc",
    });
  });

  it("keeps a cleared date as an open bound", () => {
    expect(salesReportFiltersFrom(new URLSearchParams("from=&to=2026-11-01"), TODAY)).toEqual({
      from: "",
      to: "2026-11-01",
      buyGuid: null,
    });
  });
});

describe("salesMarginPercent", () => {
  it("measures profit against revenue", () => {
    expect(salesMarginPercent(25, 75)).toBe(25);
    expect(salesMarginPercent(0, 0)).toBe(0);
  });
});
