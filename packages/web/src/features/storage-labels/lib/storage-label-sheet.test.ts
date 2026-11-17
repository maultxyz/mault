import { describe, expect, it } from "vitest";
import { qrCodeModules } from "./storage-label-sheet";

describe("qrCodeModules", () => {
  it("draws a square module grid", () => {
    const { path, moduleCount } = qrCodeModules("https://mault.xyz/app/storage?location=x&org=y");
    expect(moduleCount).toBeGreaterThan(20);
    expect(path.startsWith("M")).toBe(true);
  });
});
