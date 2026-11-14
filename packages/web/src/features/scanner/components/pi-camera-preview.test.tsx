import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PiCameraPreview } from "@/features/scanner/components/pi-camera-preview";
import { fitCanvasesToContainer, observeContainerResize } from "@/features/scanner/lib/canvas-fit";

vi.mock("@/lib/api/client", () => ({
  getAuthHeaders: async () => ({ Authorization: "Bearer test" }),
}));
vi.mock("@/features/scanner/lib/canvas-fit", () => ({
  fitCanvasesToContainer: vi.fn(),
  observeContainerResize: vi.fn(() => vi.fn()),
}));

describe("Pi camera preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["frame"], { type: "image/jpeg" }),
    }));
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:pi-preview"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("loads authenticated frames without browser camera or MediaStream support", async () => {
    vi.stubGlobal("MediaStream", undefined);
    const { unmount } = render(<PiCameraPreview alt="Pi camera" rotated />);
    await waitFor(() => expect(screen.getByAltText("Pi camera")).toHaveAttribute("src", "blob:pi-preview"));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/pi-camera/frame"), expect.objectContaining({
      headers: { Authorization: "Bearer test" },
      cache: "no-store",
    }));
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:pi-preview");
  });

  it("fits the rotated image on load and observes mobile container resizing", async () => {
    render(<PiCameraPreview alt="Pi camera" rotated flipped />);
    const image = screen.getByAltText("Pi camera");
    await waitFor(() => expect(image).toHaveAttribute("src", "blob:pi-preview"));
    Object.defineProperties(image, {
      naturalWidth: { value: 1920 },
      naturalHeight: { value: 1080 },
    });
    fireEvent.load(image);
    expect(image).toHaveClass("-rotate-90");
    expect(fitCanvasesToContainer).toHaveBeenLastCalledWith([image], 1920, 1080, true);
    expect(observeContainerResize).toHaveBeenCalledWith(image, expect.any(Function));
  });
});
