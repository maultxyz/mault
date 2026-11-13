import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CameraProvider, useCameraContext } from "./use-camera";

const mocks = vi.hoisted(() => ({
  toastError: vi.fn(),
  readHealth: vi.fn(),
  mustUsePi: vi.fn(),
  acquireStream: vi.fn(),
  acquireRelay: vi.fn(),
  applyTrackFocus: vi.fn().mockResolvedValue(undefined),
  applyPiFocus: vi.fn().mockResolvedValue(undefined),
  loadSavedFocus: vi.fn(),
  isMobile: vi.fn(),
  setStationCamera: vi.fn(),
  queryClient: { fetchQuery: vi.fn() },
  t: (key: string) => key,
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: undefined }),
  useQueryClient: () => mocks.queryClient,
}));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: mocks.t }) }));
vi.mock("@/features/collections/api/use-collections", () => ({
  useCollections: () => ({ activeCollection: null }),
}));
vi.mock("./use-phone-camera-capture", () => ({
  usePhoneCameraCapture: () => ({}),
}));
vi.mock("./use-stations", () => ({
  useStation: () => ({ station: { id: "station" }, isLive: true }),
  useStations: () => ({
    setStationCamera: mocks.setStationCamera,
    stations: [],
    isStationLive: () => false,
  }),
}));
vi.mock("@/hooks/use-is-mobile", () => ({ useIsMobile: mocks.isMobile }));
vi.mock("@/hooks/use-pi-host", () => ({ usePiHost: () => true }));
vi.mock("@/lib/host", () => ({ usesHostHardware: () => true }));
vi.mock("@/lib/pi-host", () => ({ loadPiHost: async () => {} }));
vi.mock("../lib/camera-focus", () => ({
  loadSavedFocus: mocks.loadSavedFocus,
  saveFocus: vi.fn(),
}));
vi.mock("../lib/camera-stream", () => ({
  acquireFreeStream: mocks.acquireStream,
  camerasHeldByOtherStations: () => new Set(),
  stopMediaStream: vi.fn(),
  waitForTrackSetup: async () => {},
}));
vi.mock("../lib/pi-camera", () => ({
  readPiCameraHealth: mocks.readHealth,
  browserMustUsePiCamera: mocks.mustUsePi,
  acquirePiRelayStream: mocks.acquireRelay,
  applyTrackFocus: mocks.applyTrackFocus,
  applyPiFocus: mocks.applyPiFocus,
  focusRangeForTrack: () => ({ min: 0, max: 100, step: 1 }),
  piCameraDevice: () => ({ deviceId: "pi-camera", kind: "videoinput" }),
  isPiRelayTrack: () => false,
}));

describe("camera startup focus", () => {
  const track = { getSettings: () => ({ deviceId: "webcam" }) };
  const stream = { getVideoTracks: () => [track] };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readHealth.mockResolvedValue({ status: "unavailable" });
    mocks.mustUsePi.mockReturnValue(false);
    mocks.isMobile.mockReturnValue(false);
    mocks.loadSavedFocus.mockReturnValue(null);
    mocks.acquireStream.mockResolvedValue(stream);
    mocks.acquireRelay.mockResolvedValue(stream);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        enumerateDevices: async () => [],
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
  });
  afterEach(cleanup);

  it.each(["Pi relay", "Pi mobile"])(
    "reads shared manual focus on %s without changing the camera",
    async (source) => {
      mocks.readHealth.mockResolvedValue({
        status: "ready",
        focus: { min: 0, max: 100, step: 1 },
        focusMode: "manual",
        lensPosition: 37,
      });
      // A stale browser preference must not overwrite the shared camera.
      mocks.loadSavedFocus.mockReturnValue(42);
      if (source === "Pi mobile") {
        mocks.mustUsePi.mockReturnValue(true);
        mocks.isMobile.mockReturnValue(true);
      }
      const { result } = renderHook(() => useCameraContext(), {
        wrapper: CameraProvider,
      });
      await waitFor(() => expect(result.current.focusDistance).toBe(37));
      expect(mocks.applyTrackFocus).not.toHaveBeenCalled();
      expect(mocks.applyPiFocus).not.toHaveBeenCalled();
    },
  );

  it("does not enable Pi autofocus when this browser has no saved setting", async () => {
    mocks.readHealth.mockResolvedValue({
      status: "ready",
      focus: { min: 0, max: 100, step: 1 },
      focusMode: "manual",
      lensPosition: 37,
    });
    const { result } = renderHook(() => useCameraContext(), {
      wrapper: CameraProvider,
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(mocks.applyTrackFocus).not.toHaveBeenCalled();
    expect(mocks.applyPiFocus).not.toHaveBeenCalled();
    expect(result.current.focusDistance).toBe(37);
  });

  it("keeps the confirmed Pi focus setting when a change fails", async () => {
    mocks.mustUsePi.mockReturnValue(true);
    mocks.readHealth.mockResolvedValue({
      status: "ready",
      focus: { min: 0, max: 100, step: 1 },
      focusMode: "manual",
      lensPosition: 37,
    });
    mocks.applyPiFocus.mockRejectedValueOnce(new Error("driver rejected"));
    const { result } = renderHook(() => useCameraContext(), {
      wrapper: CameraProvider,
    });
    await waitFor(() => expect(result.current.focusDistance).toBe(37));
    act(() => result.current.setFocusDistance(null));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalled());
    expect(result.current.focusDistance).toBe(37);
  });

  it("leaves local driver focus unchanged when no manual value is saved", async () => {
    const { result } = renderHook(() => useCameraContext(), {
      wrapper: CameraProvider,
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(mocks.applyTrackFocus).not.toHaveBeenCalled();
    expect(mocks.applyPiFocus).not.toHaveBeenCalled();
  });

  it("restores saved local manual focus", async () => {
    mocks.loadSavedFocus.mockReturnValue(42);
    renderHook(() => useCameraContext(), { wrapper: CameraProvider });
    await waitFor(() =>
      expect(mocks.applyTrackFocus).toHaveBeenCalledWith(track, 42),
    );
  });
});
