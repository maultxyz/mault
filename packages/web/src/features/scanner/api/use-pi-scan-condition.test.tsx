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

describe("Pi scan condition settings", () => {
  it("reads live condition on mount and reconnect without writing local defaults", () => {
    vi.mocked(getPiScanState).mockReturnValue({ ...live, condition: "LP" });
    const local = { ...options(), condition: "NM" as const, setCondition: vi.fn() };
    const first = renderHook(() => usePiScanSettings(local));
    expect(first.result.current.condition).toBe("LP");
    first.unmount();
    const second = renderHook(() => usePiScanSettings(local));
    expect(second.result.current.condition).toBe("LP");
    expect(updatePiScanSettings).not.toHaveBeenCalled();
    expect(local.setCondition).not.toHaveBeenCalled();
  });

  it("patches only condition for an explicit edit and applies the returned session", async () => {
    const local = { ...options(), condition: "NM" as const, setCondition: vi.fn() };
    const { result } = renderHook(() => usePiScanSettings(local));
    act(() => result.current.setCondition("HP"));
    expect(local.setCondition).toHaveBeenCalledWith("HP");
    expect(updatePiScanSettings).toHaveBeenCalledExactlyOnceWith({ condition: "HP" });
    await waitFor(() => expect(applyPiScanState).toHaveBeenCalledWith(live));
  });

  it("keeps local condition when the server has no condition and does not write on polling", () => {
    const local = { ...options(), condition: "MP" as const, setCondition: vi.fn() };
    const { result, rerender } = renderHook(() => usePiScanSettings(local));
    expect(result.current.condition).toBe("MP");
    vi.mocked(getPiScanState).mockReturnValue({ ...live, condition: "DMG" });
    rerender();
    expect(result.current.condition).toBe("DMG");
    expect(updatePiScanSettings).not.toHaveBeenCalled();
  });

  it("edits local condition without changing a different collection's session", () => {
    vi.mocked(getPiScanState).mockReturnValue({ ...live, collectionGuid: "other", condition: "LP" });
    const local = { ...options(), condition: "NM" as const, setCondition: vi.fn() };
    const { result } = renderHook(() => usePiScanSettings(local));
    expect(result.current.condition).toBe("NM");
    act(() => result.current.setCondition("MP"));
    expect(local.setCondition).toHaveBeenCalledWith("MP");
    expect(updatePiScanSettings).not.toHaveBeenCalled();
  });
});
