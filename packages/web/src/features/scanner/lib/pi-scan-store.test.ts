import { expect, it, vi } from "vitest";
import { applyPiScanState, getPiScanState } from "./pi-scan-store";
import { IDLE_PI_SCAN_SESSION } from "@/lib/constants/scanner";
vi.mock("@/lib/pi-host", () => ({ loadPiHost: async () => false }));
vi.mock("../api/pi-scan-session", () => ({
  fetchPiScanSession: vi.fn(),
  piScanHoldsPort: (state: { phase: string }) => ["running", "paused"].includes(state.phase),
}));
it("publishes changes to foil and preferred sets even if scan progress stays the same", () => {
  const original = { ...IDLE_PI_SCAN_SESSION, foilType: null, preferredSetCodes: [] };
  applyPiScanState(original);
  applyPiScanState({ ...original, foilType: "foil" });
  expect(getPiScanState().foilType).toBe("foil");
  applyPiScanState({ ...original, foilType: "foil", preferredSetCodes: ["dsk"] });
  expect(getPiScanState().preferredSetCodes).toEqual(["dsk"]);
});
