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

it("publishes pending-save-only transitions and clears them on organization reset", () => {
  resetPiScanScope("org-a");
  const original = { ...IDLE_PI_SCAN_SESSION, collectionGuid: "collection" };
  applyPiScanState(original);
  const pending = {
    orgId: "org-a",
    collectionGuid: "collection",
    scanId: "scan",
    status: "saving" as const,
    updatedAt: 1,
    card: { id: "card", name: "Card", set: "set", collectorNumber: "1" },
  };
  applyPiScanState({ ...original, pendingSave: pending });
  expect(getPiScanState().pendingSave?.status).toBe("saving");
  applyPiScanState({
    ...original,
    pendingSave: { ...pending, status: "saved", updatedAt: 2 },
  });
  expect(getPiScanState().pendingSave?.status).toBe("saved");
  resetPiScanScope("org-b");
  expect(getPiScanState().pendingSave).toBeUndefined();
});

it("does not accumulate status requests while a slow poll is pending", async () => {
  mocks.host.mockResolvedValue(true);
  let finish: (value: typeof IDLE_PI_SCAN_SESSION) => void = () => {};
  mocks.fetch.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  resetPiScanScope("org-a");
  const unsubscribe = subscribePiScan(() => {});
  try {
    await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalledOnce());
    await vi.advanceTimersByTimeAsync(4000);
    expect(mocks.fetch).toHaveBeenCalledOnce();
    finish({ ...IDLE_PI_SCAN_SESSION, cardsScanned: 58 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  } finally {
    unsubscribe();
  }
});

it("continues polling after a failed request", async () => {
  mocks.host.mockResolvedValue(true);
  mocks.fetch.mockRejectedValueOnce(new Error("connection interrupted"));
  resetPiScanScope("org-a");
  const unsubscribe = subscribePiScan(() => {});
  try {
    await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalledOnce());
    await vi.advanceTimersByTimeAsync(1000);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  } finally {
    unsubscribe();
  }
});


it("aborts an unsubscribed poll and ignores its late state after subscribing again", async () => {
  mocks.host.mockResolvedValue(true);
  let finish!: (value: typeof IDLE_PI_SCAN_SESSION) => void;
  mocks.fetch.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  resetPiScanScope("org-a");
  const unsubscribe = subscribePiScan(() => {});
  await vi.advanceTimersByTimeAsync(0);
  const signal = mocks.fetch.mock.calls[0][0] as AbortSignal;
  unsubscribe();
  expect(signal.aborted).toBe(true);
  const stop = subscribePiScan(() => {});
  await vi.advanceTimersByTimeAsync(0);
  finish({ ...IDLE_PI_SCAN_SESSION, cardsScanned: 99 });
  await vi.advanceTimersByTimeAsync(0);
  expect(getPiScanState().cardsScanned).toBe(0);
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
  stop();
});
