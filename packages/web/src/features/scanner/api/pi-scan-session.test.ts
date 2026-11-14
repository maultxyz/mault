import { isPiScanHoldingPort, setPiScanHoldingPort } from "../lib/pi-scan-hold";
import { afterEach, expect, it, vi } from "vitest";
import { updatePiScanSettings, refreshPiScanHold } from "./pi-scan-session";
import { IDLE_PI_SCAN_SESSION } from "@/lib/constants/scanner";
const mocks = vi.hoisted(() => ({ orgId: "org-a" }));
vi.mock("@/lib/api/client", () => ({
  getAuthHeaders: async () => ({ "X-Org-Id": mocks.orgId }),
  getRequestAuth: async () => ({ orgId: mocks.orgId, token: "token" }),
}));
vi.mock("@/lib/pi-host", () => ({ loadPiHost: async () => true }));
afterEach(() => {
  vi.unstubAllGlobals();
  mocks.orgId = "org-a";
});
it("discards a settings result when its request organization changes during fetch", async () => {
  let finish: (value: unknown) => void = () => {};
  const fetch = vi.fn(
    (_url: string, _options: RequestInit) =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  vi.stubGlobal("fetch", fetch);
  const pending = updatePiScanSettings({ autoFeed: true });
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  expect(
    (fetch.mock.calls[0][1].headers as Record<string, string>)["x-org-id"],
  ).toBe("org-a");
  mocks.orgId = "org-b";
  finish({
    json: async () => ({
      success: true,
      data: {
        ...IDLE_PI_SCAN_SESSION,
        collectionGuid: "same",
        phase: "running",
      },
    }),
  });
  const result = await pending;
  expect(result.success).toBe(false);
  expect(result.data).toBeUndefined();
});

it("a delayed old-organization refresh cannot release the new organization's serial hold", async () => {
  let finish: (value: unknown) => void = () => {};
  const fetch = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  vi.stubGlobal("fetch", fetch);
  const pending = refreshPiScanHold();
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  mocks.orgId = "org-b";
  setPiScanHoldingPort(true);
  finish({ json: async () => ({ success: true, data: IDLE_PI_SCAN_SESSION }) });
  expect(await pending).toBe(true);
  expect(isPiScanHoldingPort()).toBe(true);
});
