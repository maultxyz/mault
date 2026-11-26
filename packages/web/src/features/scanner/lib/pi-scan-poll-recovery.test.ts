import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getPiScanState, resetPiScanScope, subscribePiScan } from "./pi-scan-store";
import { IDLE_PI_SCAN_SESSION, PI_SCAN_POLL_TIMEOUT_MS } from "@/lib/constants/scanner";

const mocks = vi.hoisted(() => ({ headers: vi.fn(), auth: vi.fn(), host: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ getAuthHeaders: mocks.headers, getRequestAuth: mocks.auth }));
vi.mock("@/lib/pi-host", () => ({ loadPiHost: mocks.host }));
let unsubscribe: (() => void) | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  mocks.headers.mockReset().mockResolvedValue({ "X-Org-Id": "org-a" });
  mocks.auth.mockReset().mockResolvedValue({ orgId: "org-a", token: "token" });
  mocks.host.mockReset().mockResolvedValue(true);
  resetPiScanScope(null);
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => ({
    json: async () => ({ success: true, data: { ...IDLE_PI_SCAN_SESSION, cardsScanned: 58 } }),
  })));
});
afterEach(() => {
  unsubscribe?.(); unsubscribe = undefined;
  resetPiScanScope(null);
  vi.unstubAllGlobals(); vi.useRealTimers();
});

it.each(["host", "auth", "headers", "body", "postAuth"])("recovers when %s ignores cancellation and never settles", async (stage) => {
  let finish!: (value: unknown) => void;
  const blocked = new Promise((resolve) => { finish = resolve; });
  const oldState = { success: true, data: { ...IDLE_PI_SCAN_SESSION, cardsScanned: 99 } };
  if (stage === "host") mocks.host.mockReturnValueOnce(blocked);
  if (stage === "auth") mocks.headers.mockReturnValueOnce(blocked);
  if (stage === "headers") vi.mocked(fetch).mockReturnValueOnce(blocked as Promise<Response>);
  if (stage === "body") vi.mocked(fetch).mockResolvedValueOnce({ json: () => blocked } as unknown as Response);
  if (stage === "postAuth") {
    vi.mocked(fetch).mockResolvedValueOnce({ json: async () => oldState } as Response);
    mocks.auth.mockReturnValueOnce(blocked);
  }
  resetPiScanScope("org-a");
  unsubscribe = subscribePiScan(() => {});
  await vi.advanceTimersByTimeAsync(0);
  const fetchesBeforeDeadline = vi.mocked(fetch).mock.calls.length;
  const requestSignal = vi.mocked(fetch).mock.calls[0]?.[1]?.signal;
  await vi.advanceTimersByTimeAsync(PI_SCAN_POLL_TIMEOUT_MS - 1);
  expect(fetch).toHaveBeenCalledTimes(fetchesBeforeDeadline);
  expect(getPiScanState().cardsScanned).toBe(0);
  await vi.advanceTimersByTimeAsync(1001);
  expect(getPiScanState().cardsScanned).toBe(58);
  if (requestSignal) expect(requestSignal.aborted).toBe(true);
  if (stage === "host") finish(true);
  else if (stage === "auth") finish({ "X-Org-Id": "org-a" });
  else if (stage === "headers") finish({ json: async () => oldState });
  else if (stage === "body") finish(oldState);
  else finish({ orgId: "org-a", token: "token" });
  await vi.advanceTimersByTimeAsync(0);
  expect(getPiScanState().cardsScanned).toBe(58);
});
