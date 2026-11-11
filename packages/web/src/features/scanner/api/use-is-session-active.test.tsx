import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIsSessionActive } from "@/features/scanner/api/use-is-session-active";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { getPiScanState } from "@/features/scanner/lib/pi-scan-store";
import { IDLE_PI_SCAN_SESSION } from "@/lib/constants/scanner";
import { usePiHostState } from "@/hooks/use-pi-host";

vi.mock("@/hooks/use-pi-host", () => ({ usePiHostState: vi.fn() }));

vi.mock("@/features/scanner/api/use-scanned-cards", () => ({
  useScannedCards: vi.fn(),
}));
vi.mock("@/features/scanner/lib/pi-scan-store", () => ({
  getPiScanState: vi.fn(),
  subscribePiScan: () => () => {},
}));

describe("hardware editing session lock", () => {
  beforeEach(() => {
    vi.mocked(usePiHostState).mockReturnValue({
      piHost: true,
      piSorter: true,
      settled: true,
    });
    vi.mocked(useScannedCards).mockReturnValue({
      isTimerActive: false,
    } as ReturnType<typeof useScannedCards>);
    vi.mocked(getPiScanState).mockReturnValue(IDLE_PI_SCAN_SESSION);
  });

  it("allows calibration when neither the browser nor the Pi is scanning", () => {
    expect(renderHook(() => useIsSessionActive()).result.current).toBe(false);
  });

  it.each(["running", "paused"] as const)(
    "locks every browser while the Pi scan is %s",
    (phase) => {
      vi.mocked(getPiScanState).mockReturnValue({
        ...IDLE_PI_SCAN_SESSION,
        phase,
      });
      expect(renderHook(() => useIsSessionActive()).result.current).toBe(true);
    },
  );

  it("preserves the existing browser-owned scan lock", () => {
    vi.mocked(useScannedCards).mockReturnValue({
      isTimerActive: true,
    } as ReturnType<typeof useScannedCards>);
    expect(renderHook(() => useIsSessionActive()).result.current).toBe(true);
  });

  it("does not change session locking for USB/Arduino mode", () => {
    vi.mocked(usePiHostState).mockReturnValue({
      piHost: true,
      piSorter: false,
      settled: true,
    });
    vi.mocked(getPiScanState).mockReturnValue({
      ...IDLE_PI_SCAN_SESSION,
      phase: "running",
    });
    expect(renderHook(() => useIsSessionActive()).result.current).toBe(false);
  });
});
