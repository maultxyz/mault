import { expect, it, vi } from "vitest";
import { applyPiScanState, getPiScanState } from "./pi-scan-store";
import { IDLE_PI_SCAN_SESSION } from "@/lib/constants/scanner";
vi.mock("@/lib/pi-host", () => ({ loadPiHost: async () => false }));
vi.mock("../api/pi-scan-session", () => ({
  fetchPiScanSession: vi.fn(),
  piScanHoldsPort: (state: { phase: string }) => ["running", "paused"].includes(state.phase),
}));
it("publishes a condition edit when scan progress has not changed", () => {
  applyPiScanState({ ...IDLE_PI_SCAN_SESSION, condition: "NM" });
  applyPiScanState({ ...IDLE_PI_SCAN_SESSION, condition: "LP" });
  expect(getPiScanState().condition).toBe("LP");
});
