import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MILO_INPUT_SIZE } from "@magic-vault/shared";
import { loadSyncCanvas } from "./embed-sync-image";

const drawImage = vi.fn();
const rotate = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob() }));
  const getContext = function (this: HTMLCanvasElement) {
    return {
      canvas: this, drawImage, rotate, translate: vi.fn(), setTransform: vi.fn(), fillRect: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(getContext as unknown as HTMLCanvasElement["getContext"]);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

it("keeps portrait catalog pixels at native resolution for printing marks", async () => {
  const bitmap = { width: 488, height: 680, close: vi.fn() };
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
  const canvas = await loadSyncCanvas("https://example.test/image", new AbortController().signal, true);
  expect([canvas.width, canvas.height]).toEqual([488, 680]);
  expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 488, 680);
  expect(bitmap.close).toHaveBeenCalled();
});

it("rotates landscape images clockwise without downsampling printing marks", async () => {
  const bitmap = { width: 680, height: 488, close: vi.fn() };
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
  const canvas = await loadSyncCanvas("https://example.test/image", new AbortController().signal, true);
  expect([canvas.width, canvas.height]).toEqual([488, 680]);
  expect(rotate).toHaveBeenCalledWith(Math.PI / 2);
  expect(drawImage).toHaveBeenLastCalledWith(expect.any(HTMLCanvasElement), 0, 0, 488, 680);
});

it("continues to resize vectorization images to the model input dimensions", async () => {
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 488, height: 680, close: vi.fn() }));
  const canvas = await loadSyncCanvas("https://example.test/image", new AbortController().signal);
  expect([canvas.width, canvas.height]).toEqual([MILO_INPUT_SIZE, MILO_INPUT_SIZE]);
});
