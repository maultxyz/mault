import { afterEach, describe, expect, it, vi } from "vitest";
import { lockTrackFocus } from "./pi-camera";
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
