import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { StandaloneDocumentFeederOptions } from "@/lib/interfaces/scanner";
import type { DesktopDocumentScannerFeedResult } from "@magic-vault/shared";
import { useStandaloneDocumentFeeder } from "./use-standalone-document-feeder";

const feederPage: DesktopDocumentScannerFeedResult = {
  type: "page",
  fileName: "page-00001.jpg",
  mimeType: "image/jpeg",
  imageBytes: new Uint8Array([1]),
  paperSource: "feeder",
};

function feederOptions(
  overrides: Partial<StandaloneDocumentFeederOptions> = {},
): StandaloneDocumentFeederOptions {
  return {
    isEnabled: true,
    isAutoFeedEnabled: true,
    scannerStatus: "scanning",
    feedDocumentScannerCard: vi.fn().mockResolvedValue(feederPage),
    discardDocumentScannerPage: vi.fn(),
    onCardReady: vi.fn(),
    onHopperEmpty: vi.fn(),
    onFeedFailed: vi.fn(),
    ...overrides,
  };
}

async function renderFeeder(options: StandaloneDocumentFeederOptions) {
  const rendered = renderHook(
    (props: StandaloneDocumentFeederOptions) => useStandaloneDocumentFeeder(props),
    { initialProps: options },
  );
  await act(async () => {});
  return rendered;
}

describe("useStandaloneDocumentFeeder", () => {
  it("does not feed while paused", async () => {
    const options = feederOptions({ scannerStatus: "paused" });
    await renderFeeder(options);
    expect(options.feedDocumentScannerCard).not.toHaveBeenCalled();
  });

  it("feeds a card and hands it off once scanning starts", async () => {
    const options = feederOptions();
    await renderFeeder(options);
    expect(options.feedDocumentScannerCard).toHaveBeenCalledTimes(1);
    expect(options.onCardReady).toHaveBeenCalledTimes(1);
  });

  it("feeds the next card after identification finishes, including after a no-match", async () => {
    const options = feederOptions();
    const { rerender } = await renderFeeder(options);
    rerender({ ...options, scannerStatus: "searching" });
    await act(async () => {});
    expect(options.feedDocumentScannerCard).toHaveBeenCalledTimes(1);
    rerender({ ...options, scannerStatus: "no-match" });
    await act(async () => {});
    expect(options.feedDocumentScannerCard).toHaveBeenCalledTimes(2);
    expect(options.onCardReady).toHaveBeenCalledTimes(2);
  });

  it("feeds only when asked while auto feed is off", async () => {
    const options = feederOptions({ isAutoFeedEnabled: false });
    const { result, rerender } = await renderFeeder(options);
    expect(options.feedDocumentScannerCard).not.toHaveBeenCalled();
    await act(async () => result.current.feedOneCard());
    expect(options.feedDocumentScannerCard).toHaveBeenCalledTimes(1);
    expect(options.onCardReady).toHaveBeenCalledTimes(1);
    rerender({ ...options, scannerStatus: "searching" });
    rerender({ ...options, scannerStatus: "scanning" });
    await act(async () => {});
    expect(options.feedDocumentScannerCard).toHaveBeenCalledTimes(1);
  });

  it("waits on a duplicate prompt", async () => {
    const options = feederOptions({ scannerStatus: "duplicate" });
    await renderFeeder(options);
    expect(options.feedDocumentScannerCard).not.toHaveBeenCalled();
  });

  it("reports an empty hopper", async () => {
    const options = feederOptions({
      feedDocumentScannerCard: vi
        .fn()
        .mockResolvedValue({ type: "error", reason: "feeder_empty" }),
    });
    await renderFeeder(options);
    expect(options.onHopperEmpty).toHaveBeenCalledTimes(1);
    expect(options.onFeedFailed).not.toHaveBeenCalled();
    expect(options.onCardReady).not.toHaveBeenCalled();
  });

  it("reports other scanner errors, including a rejected feed", async () => {
    const options = feederOptions({
      feedDocumentScannerCard: vi.fn().mockRejectedValue(new Error("bridge gone")),
    });
    await renderFeeder(options);
    expect(options.onFeedFailed).toHaveBeenCalledWith("unknown");
  });

  it("discards a page that arrives after the mode was turned off", async () => {
    let resolveFeed: (result: DesktopDocumentScannerFeedResult) => void = () => {};
    const options = feederOptions({
      feedDocumentScannerCard: vi.fn(
        () =>
          new Promise<DesktopDocumentScannerFeedResult>((resolve) => {
            resolveFeed = resolve;
          }),
      ),
    });
    const { rerender } = await renderFeeder(options);
    rerender({ ...options, isEnabled: false });
    await act(async () => resolveFeed(feederPage));
    expect(options.discardDocumentScannerPage).toHaveBeenCalledTimes(1);
    expect(options.onCardReady).not.toHaveBeenCalled();
  });
});
