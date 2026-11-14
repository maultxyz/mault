import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IDLE_PI_SCAN_SESSION } from "@/lib/constants/scanner";
import { usePiScanSettings } from "./use-pi-scan-settings";
import { getPiScanState, applyPiScanState } from "../lib/pi-scan-store";
import { updatePiScanSettings } from "./pi-scan-session";
import { usePiHost } from "@/hooks/use-pi-host";

vi.mock("@/hooks/use-pi-host", () => ({ usePiHost: vi.fn(() => true) }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/toast", () => ({ toast: { error: vi.fn() } }));
vi.mock("../lib/pi-scan-store", () => ({
  getPiScanState: vi.fn(), applyPiScanState: vi.fn(), subscribePiScan: () => () => {},
}));
vi.mock("./pi-scan-session", () => ({
  piScanHoldsPort: (state: { phase: string }) => ["running", "paused"].includes(state.phase),
  updatePiScanSettings: vi.fn(),
}));

const live = {
  ...IDLE_PI_SCAN_SESSION, phase: "running" as const, collectionGuid: "collection",
  foilType: "foil", preferredSetCodes: ["dsk"],
};
const options = () => ({
  collectionGuid: "collection", foilType: null, preferredSetCodes: [],
  setFoilType: vi.fn(), setPreferredSetCodes: vi.fn(),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usePiHost).mockReturnValue(true);
  vi.mocked(getPiScanState).mockReturnValue(live);
  vi.mocked(updatePiScanSettings).mockResolvedValue({ success: true, data: live });
});
afterEach(cleanup);

describe("running Pi scan settings", () => {
  it("reads server foil settings on mount and remount without clearing them", () => {
    const first = renderHook(() => usePiScanSettings(options()));
    expect(first.result.current.foilType).toBe("foil");
    first.unmount();
    const second = renderHook(() => usePiScanSettings(options()));
    expect(second.result.current.foilType).toBe("foil");
    expect(second.result.current.preferredSetCodes).toEqual(["dsk"]);
    expect(updatePiScanSettings).not.toHaveBeenCalled();
  });

  it("reads polling changes without writing browser defaults back", () => {
    const { result, rerender } = renderHook(() => usePiScanSettings(options()));
    vi.mocked(getPiScanState).mockReturnValue({ ...live, foilType: "etched" });
    rerender();
    expect(result.current.foilType).toBe("etched");
    expect(updatePiScanSettings).not.toHaveBeenCalled();
  });

  it("only patches foil when the user explicitly changes foil", async () => {
    const { result } = renderHook(() => usePiScanSettings(options()));
    act(() => result.current.setFoilType(null));
    await waitFor(() => expect(updatePiScanSettings).toHaveBeenCalledWith({ foilType: null }));
    await waitFor(() => expect(applyPiScanState).toHaveBeenCalled());
  });

  it("does not clear foil when only the preferred set changes", () => {
    const { result } = renderHook(() => usePiScanSettings(options()));
    act(() => result.current.setPreferredSetCodes(["woe"]));
    expect(updatePiScanSettings).toHaveBeenCalledWith({ preferredSetCodes: ["woe"] });
  });

  it.each(["idle", "other collection", "non-Pi"])("preserves local settings for %s", (mode) => {
    if (mode === "idle") vi.mocked(getPiScanState).mockReturnValue(IDLE_PI_SCAN_SESSION);
    if (mode === "other collection") vi.mocked(getPiScanState).mockReturnValue({ ...live, collectionGuid: "other" });
    if (mode === "non-Pi") vi.mocked(usePiHost).mockReturnValue(false);
    const local = options();
    const { result } = renderHook(() => usePiScanSettings(local));
    expect(result.current.foilType).toBe(null);
    act(() => result.current.setFoilType("foil"));
    expect(local.setFoilType).toHaveBeenCalledWith("foil");
    expect(updatePiScanSettings).not.toHaveBeenCalled();
  });
});
