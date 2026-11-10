import type { PublicCardHold } from "@magic-vault/shared";
import { describe, expect, it } from "vitest";
import { firstAvailableScanId, holdForScans } from "./hold-for-scans";

function hold(scanId: string, isMine = false): PublicCardHold {
  return { scanId, expiresAt: null, isApproved: false, isMine };
}

describe("holdForScans", () => {
  it("shows the guest's own hold even when other copies are free", () => {
    const holds = new Map([["b", hold("b", true)]]);
    expect(holdForScans(holds, ["a", "b"])?.isMine).toBe(true);
  });

  it("treats a group as available while any copy is free", () => {
    const holds = new Map([["a", hold("a")]]);
    expect(holdForScans(holds, ["a", "b"])).toBeUndefined();
    expect(firstAvailableScanId(holds, ["a", "b"])).toBe("b");
  });

  it("marks a group on hold when every copy is held by someone else", () => {
    const holds = new Map([
      ["a", hold("a")],
      ["b", hold("b")],
    ]);
    expect(holdForScans(holds, ["a", "b"])?.scanId).toBe("a");
    expect(firstAvailableScanId(holds, ["a", "b"])).toBeUndefined();
  });
});
