import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useCardScanner } from "./use-card-scanner";

const mocks = vi.hoisted(() => ({
  search: vi.fn(),
  control: vi.fn(),
  animator: { cancel: vi.fn(), setTarget: vi.fn() },
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: undefined }),
}));
vi.mock("@/features/billing/api/billing", () => ({
  billingQueryOptions: () => ({}),
}));
vi.mock("@/features/companies/api/org-settings", () => ({
  orgSettingsQueryOptions: () => ({}),
}));
vi.mock("@/features/companies/api/use-organization", () => ({
  useOrg: () => ({}),
}));
vi.mock("@/features/calibration/api/use-device", () => ({
  useDevice: () => null,
}));
vi.mock("@/features/collections/api/use-collections", () => ({
  useCollections: () => ({
    activeCollection: { guid: "collection", game: { key: "mtg" } },
  }),
}));
vi.mock("@/features/bins/api/use-bin-configs", () => ({
  useBinConfigs: () => ({ selectedSet: null }),
}));
vi.mock("./use-stations", () => ({
  useStation: () => ({ station: { id: "station" }, isActive: true }),
}));
vi.mock("../lib/scan-page-card-image", () => ({
  orientDocumentScanImages: async (
    front: string | undefined,
    back: string | undefined,
    _matched: string | null,
    fallback: string,
  ) => ({
    capturedImageUrl: front ?? fallback,
    capturedBackImageUrl: back,
  }),
  scanPageImageDataUrl: vi.fn(),
}));
vi.mock("./use-scanned-cards", () => ({
  useScannedCards: () => ({ forceSetCodes: [] }),
}));
vi.mock("./use-camera", () => ({
  useCameraContext: () => ({
    stream: null,
    status: "ready",
    cameraSource: "webcam",
  }),
}));
vi.mock("./use-foil-detection-game-key", () => ({
  useFoilDetectionGameKey: () => "mtg",
}));
vi.mock("../lib/card-image-search", () => ({
  searchCardImageWithConsensus: mocks.search,
  captureDewarpedCardImage: vi.fn(),
}));
vi.mock("../lib/scanner-control-code", () => ({
  readScannerControlCode: mocks.control,
}));
vi.mock("../lib/outline-animator", () => ({
  createOutlineAnimator: () => mocks.animator,
}));
vi.mock("../lib/cornelius", () => ({ detectCardCorners: vi.fn() }));
vi.mock("../lib/onnx-runtime", () => ({ getOnnxRuntimeFailure: () => null }));
vi.mock("../lib/card-detection", () => ({ drawDetectionOverlay: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.control.mockReturnValue(null);
  mocks.search.mockResolvedValue({
    card: { id: "card", name: "Card" },
    alternativeMatches: [],
    debugImageUrl: "image",
    vectorizedOn: "web",
    dewarpedCardImage: {},
    matched: { lowConfidenceMatch: false, diagnostics: {} },
  });
});
afterEach(cleanup);

function attachCanvas(
  result: ReturnType<
    typeof renderHook<ReturnType<typeof useCardScanner>, unknown>
  >["result"],
) {
  const canvas = document.createElement("canvas");
  canvas.getContext = vi.fn().mockReturnValue({ clearRect: vi.fn() });
  Object.defineProperty(result.current.displayCanvasRef, "current", {
    value: canvas,
    writable: true,
  });
  act(() => result.current.handleResume());
}

it("browser control cards apply settings without identifying or saving", async () => {
  const save = vi.fn();
  const control = vi.fn();
  mocks.control.mockReturnValue("mault-control:invalid");
  const { result } = renderHook(() =>
    useCardScanner({ onSearchResults: save, onControlCode: control }),
  );
  attachCanvas(result);
  act(() => result.current.handleForceScan());
  await waitFor(() => expect(control).toHaveBeenCalledWith(null));
  expect(mocks.search).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
});

it("browser removal skips foil refinement and addition callbacks", async () => {
  const save = vi.fn();
  const remove = vi.fn();
  const foil = vi.fn();
  const { result } = renderHook(() =>
    useCardScanner({
      isRemoval: () => true,
      onRemoval: remove,
      onSearchResults: save,
      checkFoilByNudge: foil,
    }),
  );
  attachCanvas(result);
  act(() => result.current.handleForceScan());
  await waitFor(() =>
    expect(remove).toHaveBeenCalledWith([{ id: "card", name: "Card" }]),
  );
  expect(save).not.toHaveBeenCalled();
  expect(foil).not.toHaveBeenCalled();
  expect(mocks.search.mock.calls[0].at(-1)).toBe("mtg");
});

it("browser matched capture refines foil before delivering the scan", async () => {
  const events: string[] = [];
  const save = vi.fn(() => {
    events.push("save");
  });
  const foil = vi.fn(async () => {
    events.push("foil");
    return null;
  });
  const { result } = renderHook(() =>
    useCardScanner({ onSearchResults: save, checkFoilByNudge: foil }),
  );
  attachCanvas(result);
  act(() => result.current.handleForceScan());
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(events).toEqual(["foil", "save"]);
});
