import { afterEach, expect, it, vi } from "vitest";
import { IDLE_PI_SCAN_SESSION } from "@/lib/constants/scanner";
import { applyPiScanState, getPiScanState, switchPiScanTarget } from "./pi-scan-store";
import { piScanSessionApiPath } from "./pi-scan-target";

vi.mock("@/lib/pi-host", () => ({ loadPiHost: async () => false }));
vi.mock("../api/pi-scan-session", () => ({
  fetchPiScanSession: async () => IDLE_PI_SCAN_SESSION,
  piScanHoldsPort: (state: { phase: string }) => ["running", "paused"].includes(state.phase),
}));

const HOST_GUID = "4f6c2b1a-0d3e-4c5f-8a9b-1c2d3e4f5a6b";

afterEach(() => switchPiScanTarget(null));

it("sends scan session requests to the self-hosted Pi until a linked Pi is targeted", () => {
  expect(piScanSessionApiPath()).toBe("/api/scan-session");
  expect(piScanSessionApiPath("pause")).toBe("/api/scan-session/pause");
  switchPiScanTarget(HOST_GUID);
  expect(piScanSessionApiPath()).toBe(`/api/pi-hosts/${HOST_GUID}/scan-session`);
  expect(piScanSessionApiPath("removal")).toBe(`/api/pi-hosts/${HOST_GUID}/scan-session/removal`);
});

it("forgets the previous Pi's scan state when the target changes", () => {
  switchPiScanTarget(HOST_GUID);
  applyPiScanState({ ...IDLE_PI_SCAN_SESSION, phase: "running", cardsScanned: 4 });
  expect(getPiScanState().cardsScanned).toBe(4);
  switchPiScanTarget(null);
  expect(getPiScanState()).toEqual(IDLE_PI_SCAN_SESSION);
});
