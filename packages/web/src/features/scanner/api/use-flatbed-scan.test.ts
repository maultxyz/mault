import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FlatbedScanFlowOptions } from "@/lib/interfaces/scanner";
import type { DesktopDocumentScannerFeedResult } from "@magic-vault/shared";
import { useFlatbedScan } from "./use-flatbed-scan";

const flatbedPage: DesktopDocumentScannerFeedResult = {
  type: "page",
  fileName: "page-00001.jpg",
  mimeType: "image/jpeg",
  imageBytes: new Uint8Array([1]),
  paperSource: "flatbed",
};

function flowOptions(
  overrides: Partial<FlatbedScanFlowOptions> = {},
): FlatbedScanFlowOptions {
  return {
    isEnabled: true,
    hasSorter: true,
    ignoreIrSensors: false,
    scannerStatus: "scanning",
    readIR: vi.fn().mockResolvedValue([false, false, false]),
    scanFlatbedCard: vi.fn().mockResolvedValue(flatbedPage),
    discardDocumentScannerPage: vi.fn(),
    onCardReady: vi.fn(),
    onScanFailed: vi.fn(),
    onModuleOneNotEmpty: vi.fn(),
    ...overrides,
  };
}

async function flushTimers(milliseconds: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

describe("useFlatbedScan", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("identifies straight away when no sorter is connected, then finishes", async () => {
    const options = flowOptions({ hasSorter: false });
    const { result, rerender } = renderHook(
      (props: FlatbedScanFlowOptions) => useFlatbedScan(props),
      { initialProps: options },
    );

    await act(async () => result.current.scanCard());
    await flushTimers(0);

    expect(options.readIR).not.toHaveBeenCalled();
    expect(options.onCardReady).toHaveBeenCalledTimes(1);
    expect(result.current.step).toBe("identifying");

    rerender({ ...options, scannerStatus: "searching" });
    rerender({ ...options, scannerStatus: "scanning" });
    expect(result.current.step).toBe("done");
  });

  it("refuses to scan while module 1 already holds a card", async () => {
    const options = flowOptions({
      readIR: vi.fn().mockResolvedValue([true, false, false]),
    });
    const { result } = renderHook(() => useFlatbedScan(options));

    await act(async () => result.current.scanCard());
    await flushTimers(0);

    expect(options.onModuleOneNotEmpty).toHaveBeenCalledTimes(1);
    expect(options.scanFlatbedCard).not.toHaveBeenCalled();
    expect(result.current.step).toBe("place-card");
  });

  it("waits for the card to be moved into module 1 before identifying", async () => {
    const readIR = vi
      .fn()
      .mockResolvedValueOnce([false, false, false])
      .mockResolvedValueOnce([false, false, false])
      .mockResolvedValue([true, false, false]);
    const options = flowOptions({ readIR });
    const { result } = renderHook(() => useFlatbedScan(options));

    await act(async () => result.current.scanCard());
    await flushTimers(0);
    expect(result.current.step).toBe("move-card");
    expect(result.current.secondsLeft).toBeGreaterThan(0);

    await flushTimers(1000);
    expect(options.onCardReady).toHaveBeenCalledTimes(1);
    expect(result.current.step).toBe("identifying");
  });

  it("keeps the scan after a missed card so Continue can still sort it", async () => {
    let cardInModuleOne = false;
    const options = flowOptions({
      readIR: vi.fn().mockImplementation(async () => [cardInModuleOne, false, false]),
    });
    const { result } = renderHook(() => useFlatbedScan(options));

    await act(async () => result.current.scanCard());
    await flushTimers(31_000);
    expect(result.current.step).toBe("missed-card");
    expect(options.onCardReady).not.toHaveBeenCalled();

    cardInModuleOne = true;
    await act(async () => result.current.continueAfterMissedCard());
    await flushTimers(500);
    expect(options.scanFlatbedCard).toHaveBeenCalledTimes(1);
    expect(options.onCardReady).toHaveBeenCalledTimes(1);
  });

  it("discards the scan when the wait is cancelled", async () => {
    const options = flowOptions();
    const { result } = renderHook(() => useFlatbedScan(options));

    await act(async () => result.current.scanCard());
    await flushTimers(0);
    act(() => result.current.cancelWait());
    await flushTimers(31_000);

    expect(options.discardDocumentScannerPage).toHaveBeenCalledTimes(1);
    expect(options.onCardReady).not.toHaveBeenCalled();
    expect(result.current.step).toBe("place-card");
  });

  it("reports a failed scan and returns to placing a card", async () => {
    const options = flowOptions({
      scanFlatbedCard: vi.fn().mockResolvedValue({ type: "error", reason: "scanner_busy" }),
    });
    const { result } = renderHook(() => useFlatbedScan(options));

    await act(async () => result.current.scanCard());
    await flushTimers(0);

    expect(options.onScanFailed).toHaveBeenCalledWith("scanner_busy");
    expect(result.current.step).toBe("place-card");
  });
});
