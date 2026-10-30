import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentScannerFeedParams } from "@/lib/interfaces/scanner";
import type { DesktopDocumentScannerFeedResult } from "@magic-vault/shared";
import { feedCardFromDocumentScanner } from "./document-scanner-feed";

const scannedPage: DesktopDocumentScannerFeedResult = {
  type: "page",
  fileName: "page-00001.jpg",
  mimeType: "image/jpeg",
  imageBytes: new Uint8Array([1, 2, 3]),
};

function feedParams(
  overrides: Partial<DocumentScannerFeedParams>,
): DocumentScannerFeedParams {
  return {
    feedDocumentScannerCard: vi.fn().mockResolvedValue(scannedPage),
    readIR: vi.fn().mockResolvedValue([false, false, false]),
    ignoreIrSensors: false,
    describeScannerError: (reason) => `scanner error: ${reason}`,
    onFlatbedPageScanned: vi.fn(),
    cardDidNotArriveMessage: "card did not arrive",
    moduleOneNotEmptyMessage: "module one not empty",
    ...overrides,
  };
}

function parsedReply(result: { line: string }) {
  return JSON.parse(result.line) as Record<string, unknown>;
}

describe("feedCardFromDocumentScanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports the card as loaded once it drops into module 1", async () => {
    const readIR = vi
      .fn()
      .mockResolvedValueOnce([false, false, false])
      .mockResolvedValueOnce([false, false, false])
      .mockResolvedValue([true, false, false]);
    const params = feedParams({ readIR });

    const resultPromise = feedCardFromDocumentScanner(params);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(params.feedDocumentScannerCard).toHaveBeenCalledTimes(1);
    expect(parsedReply(result)).toEqual({ detected: true });
  });

  it("refuses to feed while a card is already sitting in module 1", async () => {
    const params = feedParams({
      readIR: vi.fn().mockResolvedValue([true, false, false]),
    });

    const result = await feedCardFromDocumentScanner(params);

    expect(params.feedDocumentScannerCard).not.toHaveBeenCalled();
    expect(parsedReply(result)).toEqual({ error: "module one not empty" });
  });

  it("maps an empty scanner feeder to the sorter's empty reply", async () => {
    const params = feedParams({
      feedDocumentScannerCard: vi
        .fn()
        .mockResolvedValue({ type: "error", reason: "feeder_empty" }),
    });

    const result = await feedCardFromDocumentScanner(params);

    expect(parsedReply(result)).toEqual({ empty: true });
  });

  it("turns other scanner errors into a feed error with the translated reason", async () => {
    const params = feedParams({
      feedDocumentScannerCard: vi
        .fn()
        .mockResolvedValue({ type: "error", reason: "paper_jam" }),
    });

    const result = await feedCardFromDocumentScanner(params);

    expect(parsedReply(result)).toEqual({ error: "scanner error: paper_jam" });
  });

  it("reports a stuck card when module 1 never sees it", async () => {
    const params = feedParams({});

    const resultPromise = feedCardFromDocumentScanner(params);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(parsedReply(result)).toEqual({ error: "card did not arrive" });
  });

  it("lets a simulated scanner deliver the physical card with the sorter's feeder", async () => {
    const deliverCardWithSorterFeeder = vi
      .fn()
      .mockResolvedValue({ sent: true, line: JSON.stringify({ detected: true }) });
    const params = feedParams({ deliverCardWithSorterFeeder });

    const result = await feedCardFromDocumentScanner(params);

    expect(params.feedDocumentScannerCard).toHaveBeenCalledTimes(1);
    expect(deliverCardWithSorterFeeder).toHaveBeenCalledTimes(1);
    expect(params.readIR).toHaveBeenCalledTimes(1);
    expect(parsedReply(result)).toEqual({ detected: true });
  });

  it("waits longer for a flatbed card to be moved into module 1 and prompts for it", async () => {
    let elapsedChecks = 0;
    const readIR = vi.fn().mockImplementation(async () => {
      elapsedChecks++;
      return [elapsedChecks > 60, false, false];
    });
    const params = feedParams({
      readIR,
      feedDocumentScannerCard: vi
        .fn()
        .mockResolvedValue({ ...scannedPage, paperSource: "flatbed" }),
    });

    const resultPromise = feedCardFromDocumentScanner(params);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(params.onFlatbedPageScanned).toHaveBeenCalledTimes(1);
    expect(parsedReply(result)).toEqual({ detected: true });
  });

  it("skips the IR checks when IR sensors are ignored", async () => {
    const params = feedParams({ ignoreIrSensors: true });

    const resultPromise = feedCardFromDocumentScanner(params);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(params.readIR).not.toHaveBeenCalled();
    expect(parsedReply(result)).toEqual({ detected: true });
  });
});
