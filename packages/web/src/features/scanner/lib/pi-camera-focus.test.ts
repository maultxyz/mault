import { afterEach, describe, expect, it, vi } from "vitest";
import { PI_CAMERA_DEVICE_ID } from "@/lib/constants/scanner";
import { applyPiZoom, lockTrackFocus } from "./pi-camera";
import { isPiHost } from "@/lib/pi-host";

vi.mock("@/lib/api/client", () => ({ getAuthHeaders: async () => ({}) }));
vi.mock("@/lib/pi-host", () => ({ isPiHost: vi.fn(() => true), loadPiHost: vi.fn() }));
vi.mock("@/lib/host", () => ({ usesHostHardware: () => false }));

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("locking Pi focus", () => {
  it("uses the real lens position instead of the slider midpoint", async () => {
    vi.mocked(isPiHost).mockReturnValue(true);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ lensPosition: 37 }))));
    expect(await lockTrackFocus(undefined, 50)).toBe(37);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/focus"), expect.objectContaining({
      method: "POST", body: JSON.stringify({ mode: "lock" }),
    }));
  });

  it("rejects a missing position rather than saving the midpoint", async () => {
    vi.mocked(isPiHost).mockReturnValue(true);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    await expect(lockTrackFocus(undefined, 50)).rejects.toThrow("focus position");
  });

  it("preserves local camera focus capture", async () => {
    vi.mocked(isPiHost).mockReturnValue(false);
    const track = { getSettings: () => ({ focusDistance: 12 }) } as unknown as MediaStreamTrack;
    expect(await lockTrackFocus(track, 50)).toBe(12);
  });
});

it("locks a calibration preview on the selected camera without persisting it", async () => {
  vi.mocked(isPiHost).mockReturnValue(true);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ lensPosition: 37 }))));
  expect(await lockTrackFocus(undefined, 50, `${PI_CAMERA_DEVICE_ID}:/dev/camera-b`, false)).toBe(37);
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining("cameraId=%2Fdev%2Fcamera-b"), expect.objectContaining({
    body: JSON.stringify({ mode: "lock", persist: false }),
  }));
});


it("routes zoom to the selected camera while preserving the default endpoint", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
  await applyPiZoom(240, `${PI_CAMERA_DEVICE_ID}:/dev/camera-b`);
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/zoom?cameraId=%2Fdev%2Fcamera-b"), expect.objectContaining({ body: JSON.stringify({ zoomLevel: 240 }) }));
});
