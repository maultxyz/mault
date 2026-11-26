import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MILO_INPUT_SIZE, PRINTING_MARK_VERSION } from "@magic-vault/shared";
import { useBrowserVectorize } from "./use-browser-vectorize";
import { loadSyncCanvas } from "../lib/embed-sync-image";
import { MiloSyncPool } from "../lib/milo-sync-pool";
import { claimBrowserSyncWork, submitBrowserSyncWork } from "@/lib/api/admin";

vi.mock("../lib/embed-sync-image", () => ({ loadSyncCanvas: vi.fn() }));
vi.mock("../lib/milo-sync-pool", () => ({ MiloSyncPool: { create: vi.fn() } }));
vi.mock("@/lib/api/admin", () => ({
  claimBrowserSyncWork: vi.fn(), submitBrowserSyncWork: vi.fn(), cancelSync: vi.fn(),
}));
vi.mock("@/lib/toast", () => ({ toast: { error: vi.fn() } }));
vi.mock("react-i18next", () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

function canvas(width = 488, height = 680): HTMLCanvasElement {
  const image = { width, height, data: new Uint8ClampedArray(width * height * 4) };
  image.data.fill(255);
  return {
    width, height, getContext: () => ({ getImageData: () => image }),
  } as unknown as HTMLCanvasElement;
}

const marks = {
  kind: "printingMarks" as const, gameKey: "mtg", printingMarkVersion: PRINTING_MARK_VERSION,
  cardId: "test-card", name: "Test", imageUrl: "https://example.test/large",
};

beforeEach(() => {
  vi.mocked(claimBrowserSyncWork).mockResolvedValue([]);
  vi.mocked(submitBrowserSyncWork).mockResolvedValue(undefined);
  vi.mocked(loadSyncCanvas).mockImplementation(async () => canvas());
});
afterEach(() => vi.resetAllMocks());

describe("browser sync printing marks", () => {
  it("reads catalog grids at original resolution without initializing the image model", async () => {
    vi.mocked(claimBrowserSyncWork).mockResolvedValueOnce([marks]);
    const { unmount } = renderHook(() => useBrowserVectorize(true, true, 0, 1));
    await waitFor(() => expect(submitBrowserSyncWork).toHaveBeenCalled());
    expect(MiloSyncPool.create).not.toHaveBeenCalled();
    expect(loadSyncCanvas).toHaveBeenCalledWith(marks.imageUrl, expect.any(AbortSignal), true);
    const [results, failures] = vi.mocked(submitBrowserSyncWork).mock.calls[0];
    expect(failures).toEqual([]);
    expect(results[0]).toMatchObject({ kind: "printingMarks", cardId: marks.cardId, version: PRINTING_MARK_VERSION });
    expect("grids" in results[0] && results[0].grids[0].values).toHaveLength(144);
    const signal = vi.mocked(loadSyncCanvas).mock.calls[0][1];
    unmount();
    expect(signal.aborted).toBe(true);
  });

  it("moves from vectorization to printing marks without using the model for mark tasks", async () => {
    const embed = vi.fn().mockResolvedValue(Array(128).fill(0.1));
    const close = vi.fn();
    vi.mocked(MiloSyncPool.create).mockResolvedValue({ embed, close, failure: null } as unknown as MiloSyncPool);
    vi.mocked(loadSyncCanvas).mockImplementation(async (_url, _signal, preserveSize) =>
      preserveSize ? canvas() : canvas(MILO_INPUT_SIZE, MILO_INPUT_SIZE));
    vi.mocked(claimBrowserSyncWork)
      .mockResolvedValueOnce([{ cardId: "vector-card", name: "New card", imageUrl: "https://example.test/front" }])
      .mockResolvedValueOnce([marks]);
    const { unmount } = renderHook(() => useBrowserVectorize(true, true, 0, 1));
    await waitFor(() => expect(submitBrowserSyncWork).toHaveBeenCalledTimes(2));
    expect(embed).toHaveBeenCalledTimes(1);
    expect(vi.mocked(submitBrowserSyncWork).mock.calls[1][0][0]).toMatchObject({ kind: "printingMarks" });
    unmount();
    expect(close).toHaveBeenCalled();
  });

  it("reports printing mark image failures for the correct queue without loading a model", async () => {
    vi.mocked(claimBrowserSyncWork).mockResolvedValueOnce([marks]);
    vi.mocked(loadSyncCanvas).mockRejectedValueOnce(new Error("Image fetch failed (503)"));
    const { unmount } = renderHook(() => useBrowserVectorize(true, true, 0, 1));
    await waitFor(() => expect(submitBrowserSyncWork).toHaveBeenCalledWith([], [{
      kind: "printingMarks", cardId: marks.cardId, message: "Image fetch failed (503)",
    }]));
    expect(MiloSyncPool.create).not.toHaveBeenCalled();
    unmount();
  });
});
