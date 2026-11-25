import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PiCameraPreview } from "@/features/scanner/components/pi-camera-preview";
import { fitCanvasesToContainer, observeContainerResize } from "@/features/scanner/lib/canvas-fit";
import { getAuthHeaders } from "@/lib/api/client";
import { PI_CAMERA_PREVIEW_INTERVAL_MS, PI_CAMERA_PREVIEW_TIMEOUT_MS } from "@/lib/constants/scanner";

vi.mock("@/lib/api/client", () => ({
  getAuthHeaders: vi.fn(),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/features/scanner/lib/canvas-fit", () => ({
  fitCanvasesToContainer: vi.fn(),
  observeContainerResize: vi.fn(() => vi.fn()),
}));

describe("Pi camera preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthHeaders).mockResolvedValue({ Authorization: "Bearer test" });
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
    vi.useRealTimers();
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
    expect(vi.mocked(fetch).mock.calls[0][0]).toMatch(/frame\?fresh=1$/);
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

  it.each(["auth", "headers", "body"])("bounds waiting for %s, retries, and ignores late frames", async (stage) => {
    vi.useFakeTimers();
    let finish: () => void = () => {};
    const stalled = new Promise<void>((resolve) => { finish = resolve; });
    const frame = { ok: true, blob: async () => new Blob(["late frame"]) };
    if (stage === "auth") {
      vi.mocked(getAuthHeaders).mockImplementationOnce(async () => {
        await stalled;
        return { Authorization: "Bearer test" };
      });
    } else if (stage === "headers") {
      vi.mocked(fetch).mockImplementationOnce(async () => {
        await stalled;
        return frame as Response;
      });
    } else {
      vi.mocked(fetch).mockResolvedValueOnce({
        ...frame,
        blob: async () => { await stalled; return new Blob(["late frame"]); },
      } as Response);
    }
    render(<PiCameraPreview alt="Pi camera" cameraId="pi-webcam:/dev/video-test" />);
    await act(async () => { await vi.advanceTimersByTimeAsync(PI_CAMERA_PREVIEW_TIMEOUT_MS - 1); });
    expect(getAuthHeaders).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    const signal = vi.mocked(fetch).mock.calls[0]?.[1]?.signal;
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    if (signal) expect(signal.aborted).toBe(true);
    expect(screen.getByAltText("camera.piUnavailable")).not.toHaveAttribute("src");
    await act(async () => { await vi.advanceTimersByTimeAsync(PI_CAMERA_PREVIEW_INTERVAL_MS); });
    expect(screen.getByAltText("Pi camera")).toHaveAttribute("src", "blob:pi-preview");
    expect(getAuthHeaders).toHaveBeenCalledTimes(2);
    const calls = vi.mocked(fetch).mock.calls.length;
    expect(vi.mocked(fetch).mock.calls.at(-1)?.[0]).toContain("cameraId=%2Fdev%2Fvideo-test&fresh=1");
    await act(async () => { finish(); });
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledTimes(calls);
  });

  it.each(["http", "network"])("clears a retained image after %s failure and recovers", async (failure) => {
    vi.useFakeTimers();
    render(<PiCameraPreview alt="Pi camera" />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByAltText("Pi camera")).toHaveAttribute("src", "blob:pi-preview");
    if (failure === "http") vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    else vi.mocked(fetch).mockRejectedValueOnce(new Error("connection interrupted"));
    await act(async () => { await vi.advanceTimersByTimeAsync(PI_CAMERA_PREVIEW_INTERVAL_MS); });
    expect(screen.getByAltText("camera.piUnavailable")).not.toHaveAttribute("src");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:pi-preview");
    await act(async () => { await vi.advanceTimersByTimeAsync(PI_CAMERA_PREVIEW_INTERVAL_MS); });
    expect(screen.getByAltText("Pi camera")).toHaveAttribute("src", "blob:pi-preview");
  });

  it("removes the previous image when the next frame body stalls", async () => {
    vi.useFakeTimers();
    render(<PiCameraPreview alt="Pi camera" />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      blob: () => new Promise(() => {}),
    } as Response);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PI_CAMERA_PREVIEW_INTERVAL_MS + PI_CAMERA_PREVIEW_TIMEOUT_MS);
    });
    expect(screen.getByAltText("camera.piUnavailable")).not.toHaveAttribute("src");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:pi-preview");
    await act(async () => { await vi.advanceTimersByTimeAsync(PI_CAMERA_PREVIEW_INTERVAL_MS); });
    expect(screen.getByAltText("Pi camera")).toHaveAttribute("src", "blob:pi-preview");
  });

  it("clears the old camera image and rejects its pending response after camera changes", async () => {
    vi.useFakeTimers();
    const { rerender } = render(<PiCameraPreview alt="Pi camera" cameraId="/dev/video-a" />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    let finishOld: (response: Response) => void = () => {};
    vi.mocked(fetch).mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }));
    await act(async () => { await vi.advanceTimersByTimeAsync(PI_CAMERA_PREVIEW_INTERVAL_MS); });
    const oldSignal = vi.mocked(fetch).mock.calls[1][1]?.signal;
    let finishNew: (response: Response) => void = () => {};
    vi.mocked(fetch).mockImplementationOnce(() => new Promise((resolve) => { finishNew = resolve; }));
    rerender(<PiCameraPreview alt="Pi camera" cameraId="/dev/video-b" />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(oldSignal?.aborted).toBe(true);
    expect(screen.getByAltText("Pi camera")).not.toHaveAttribute("src");
    await act(async () => {
      finishOld({ ok: true, blob: async () => new Blob(["old camera"]) } as Response);
    });
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    await act(async () => {
      finishNew({ ok: true, blob: async () => new Blob(["new camera"]) } as Response);
    });
    expect(screen.getByAltText("Pi camera")).toHaveAttribute("src", "blob:pi-preview");
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
  });

  it("aborts pending work and cancels retries on unmount", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(() => {}));
    const { unmount } = render(<PiCameraPreview alt="Pi camera" />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    const signal = vi.mocked(fetch).mock.calls[0][1]?.signal;
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(signal?.aborted).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
