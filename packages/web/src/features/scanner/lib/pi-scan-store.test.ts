import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  applyPiScanState,
  getPiScanState,
  resetPiScanScope,
  subscribePiScan,
  setPiScanHoldOverride,
  takePiScanAnnouncement,
} from "./pi-scan-store";
import { IDLE_PI_SCAN_SESSION } from "@/lib/constants/scanner";
import { isPiScanHoldingPort } from "./pi-scan-hold";
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), host: vi.fn() }));
vi.mock("@/lib/pi-host", () => ({ loadPiHost: mocks.host }));
vi.mock("../api/pi-scan-session", () => ({
  fetchPiScanSession: mocks.fetch,
  piScanHoldsPort: (state: { phase: string }) =>
    ["running", "paused"].includes(state.phase),
}));
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.host.mockResolvedValue(false);
  mocks.fetch.mockResolvedValue(IDLE_PI_SCAN_SESSION);
  resetPiScanScope(null);
});
afterEach(() => {
  resetPiScanScope(null);
  vi.useRealTimers();
});
it("publishes changes to foil and preferred sets even if scan progress stays the same", () => {
  const original = {
    ...IDLE_PI_SCAN_SESSION,
    foilType: null,
    preferredSetCodes: [],
  };
  applyPiScanState(original);
  applyPiScanState({ ...original, foilType: "foil" });
  expect(getPiScanState().foilType).toBe("foil");
  applyPiScanState({
    ...original,
    foilType: "foil",
    preferredSetCodes: ["dsk"],
  });
  expect(getPiScanState().preferredSetCodes).toEqual(["dsk"]);
});
it("scope changes clear same-collection state, holds and announcements", () => {
  resetPiScanScope("org-a");
  const old = {
    ...IDLE_PI_SCAN_SESSION,
    collectionGuid: "same",
    phase: "error" as const,
    message: "old error",
    soundEvents: [{ id: "old-sound", clipGuid: "clip", at: 1 }],
    removalEnabled: true,
    removalBusy: true,
  };
  applyPiScanState(old);
  setPiScanHoldOverride(true);
  expect(takePiScanAnnouncement(old)).toBe("error");
  resetPiScanScope("org-b");
  expect(getPiScanState()).toEqual(IDLE_PI_SCAN_SESSION);
  expect(isPiScanHoldingPort()).toBe(false);
  expect(takePiScanAnnouncement(old)).toBe("error");
});
it("a delayed poll from the previous organization cannot replace new state", async () => {
  mocks.host.mockResolvedValue(true);
  let finishOld: (value: typeof IDLE_PI_SCAN_SESSION) => void = () => {};
  mocks.fetch.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishOld = resolve;
      }),
  );
  resetPiScanScope("org-a");
  const unsubscribe = subscribePiScan(() => {});
  await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalledOnce());
  resetPiScanScope("org-b");
  await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
  applyPiScanState({
    ...IDLE_PI_SCAN_SESSION,
    collectionGuid: "same",
    phase: "paused",
    cardsScanned: 2,
  });
  finishOld({
    ...IDLE_PI_SCAN_SESSION,
    collectionGuid: "same",
    phase: "running",
    cardsScanned: 99,
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(getPiScanState().cardsScanned).toBe(2);
  expect(getPiScanState().phase).toBe("paused");
  unsubscribe();
});
