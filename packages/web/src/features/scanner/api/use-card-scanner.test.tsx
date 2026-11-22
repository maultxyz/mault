import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useCardScanner } from "./use-card-scanner";

const mocks = vi.hoisted(() => ({
  search: vi.fn(),
  control: vi.fn(),
  animator: { cancel: vi.fn(), setTarget: vi.fn() },
}));
import {
  CARD_SETTLE_POLL_INTERVAL_MS,
  CARD_SETTLE_STABLE_TICKS,
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
} from "@magic-vault/shared";
import { detectCardCorners } from "../lib/cornelius";
import type {
  CardImageSearchExtras,
  EarlyRoutedScan,
  ScanOutcome,
} from "@/lib/interfaces/scanner";

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
  scanPageCardImageDataUrl: vi.fn(),
  scanPageCardCropDataUrl: vi.fn(),
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
vi.mock("../lib/client-vectorize", () => ({
  copyFrameInto: (target: HTMLCanvasElement) => target,
}));
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

const stillCard = {
  cardPresent: true,
  confidence: 1,
  sharpness: 1,
  contour: {
    topLeft: { x: 10, y: 10 },
    topRight: { x: 110, y: 10 },
    bottomRight: { x: 110, y: 150 },
    bottomLeft: { x: 10, y: 150 },
  },
};

const matchedDetails = { lowConfidenceMatch: false, diagnostics: {} };
const provisionalOutcome = {
  card: { id: "image-card", name: "Card" },
  alternativeMatches: [{ id: "reprint", name: "Card" }],
  debugImageUrl: "provisional-image",
  vectorizedOn: "web",
  matched: matchedDetails,
  noMatch: null,
} as unknown as ScanOutcome;
const finalOutcome = {
  card: { id: "reprint", name: "Card" },
  alternativeMatches: [],
  debugImageUrl: "image",
  vectorizedOn: "web",
  dewarpedCardImage: {},
  matched: matchedDetails,
};

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

it("browser control cards apply settings and drop the identification that ran alongside", async () => {
  const save = vi.fn();
  const control = vi.fn();
  const routeEarly = vi.fn(() => null);
  mocks.control.mockReturnValue("mault-control:invalid");
  mocks.search.mockImplementation(async (...args: unknown[]) => {
    (args[10] as CardImageSearchExtras).onImageMatchBeforeText?.(
      provisionalOutcome,
    );
    return finalOutcome;
  });
  const { result } = renderHook(() =>
    useCardScanner({
      onSearchResults: save,
      onControlCode: control,
      onRouteEarly: routeEarly,
    }),
  );
  attachCanvas(result);
  act(() => result.current.handleForceScan());
  await waitFor(() => expect(control).toHaveBeenCalledWith(null));
  await waitFor(() => expect(result.current.status).toBe("scanning"));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  expect(mocks.search).toHaveBeenCalledOnce();
  expect(routeEarly).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
});

it("routes before the text match and delivers the final card with that route", async () => {
  const earlyRoute = { scanId: "scan" } as EarlyRoutedScan;
  const routeEarly = vi.fn(() => earlyRoute);
  const save = vi.fn();
  const foil = vi.fn();
  mocks.search.mockImplementation(async (...args: unknown[]) => {
    (args[10] as CardImageSearchExtras).onImageMatchBeforeText?.(
      provisionalOutcome,
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    return finalOutcome;
  });
  const { result } = renderHook(() =>
    useCardScanner({
      onSearchResults: save,
      onRouteEarly: routeEarly,
      checkFoilByNudge: foil,
    }),
  );
  attachCanvas(result);
  act(() => result.current.handleForceScan());
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(routeEarly).toHaveBeenCalledExactlyOnceWith(
    [provisionalOutcome.card, ...provisionalOutcome.alternativeMatches],
    provisionalOutcome.matched,
  );
  expect(save.mock.calls[0][0]).toEqual([finalOutcome.card]);
  expect(save.mock.calls[0][5]).toBe(earlyRoute);
  expect(foil).not.toHaveBeenCalled();
});

it("delivers an ordinary scan when the early route is declined", async () => {
  const routeEarly = vi.fn(() => null);
  const save = vi.fn();
  const foil = vi.fn(async () => null);
  mocks.search.mockImplementation(async (...args: unknown[]) => {
    (args[10] as CardImageSearchExtras).onImageMatchBeforeText?.(
      provisionalOutcome,
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    return finalOutcome;
  });
  const { result } = renderHook(() =>
    useCardScanner({
      onSearchResults: save,
      onRouteEarly: routeEarly,
      checkFoilByNudge: foil,
    }),
  );
  attachCanvas(result);
  act(() => result.current.handleForceScan());
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(routeEarly).toHaveBeenCalledOnce();
  expect(save.mock.calls[0][5]).toBeUndefined();
  expect(foil).toHaveBeenCalledOnce();
});

it("captures a card that arrived while the previous scan was still being identified", async () => {
  let finishSearch = () => {};
  mocks.search.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishSearch = () => resolve(finalOutcome);
      }),
  );
  vi.mocked(detectCardCorners).mockResolvedValue(stillCard);
  const save = vi.fn();
  const { result } = renderHook(() =>
    useCardScanner({ onSearchResults: save }),
  );
  attachCanvas(result);
  act(() => result.current.handleForceScan());
  await waitFor(() => expect(mocks.search).toHaveBeenCalledOnce());
  act(() => result.current.captureArrivedCard());
  expect(mocks.search).toHaveBeenCalledOnce();
  await act(async () => finishSearch());
  await waitFor(() => expect(mocks.search).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
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
  expect(mocks.search.mock.calls[0][7]).toBe("mtg");
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


it("captures once the detector confirms a still card, before the settle delay ends", async () => {
  vi.useFakeTimers();
  try {
    vi.mocked(detectCardCorners).mockResolvedValue(stillCard);
    const { result } = renderHook(() => useCardScanner({}));
    attachCanvas(result);
    act(() => result.current.captureCard());
    expect(mocks.search).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(
        CARD_SETTLE_POLL_INTERVAL_MS * CARD_SETTLE_STABLE_TICKS + 1,
      );
    });
    expect(mocks.search).toHaveBeenCalledOnce();
    expect(mocks.search.mock.calls[0][10].settledCapture.detection).toBe(
      stillCard,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEFAULT_CAPTURE_SETTLE_DELAY_MS);
    });
    expect(mocks.search).toHaveBeenCalledOnce();
  } finally {
    vi.useRealTimers();
  }
});

it("waits for the full settle delay while the detector sees no still card", async () => {
  vi.useFakeTimers();
  try {
    vi.mocked(detectCardCorners).mockResolvedValue({
      ...stillCard,
      cardPresent: false,
      contour: null,
    });
    const { result } = renderHook(() => useCardScanner({}));
    attachCanvas(result);
    act(() => result.current.captureCard());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEFAULT_CAPTURE_SETTLE_DELAY_MS - 1);
    });
    expect(mocks.search).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2);
    });
    expect(mocks.search).toHaveBeenCalledOnce();
    expect(mocks.search.mock.calls[0][10].settledCapture).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});

it("remembers the matched orientation and prefers it on the next live scan", async () => {
  mocks.search.mockResolvedValue({
    card: { id: "card", name: "Card" },
    alternativeMatches: [],
    debugImageUrl: "image",
    vectorizedOn: "web",
    dewarpedCardImage: {},
    matchedOrientation: "rotated",
    matched: { lowConfidenceMatch: false, diagnostics: {} },
  });
  const save = vi.fn();
  const { result } = renderHook(() =>
    useCardScanner({ onSearchResults: save }),
  );
  attachCanvas(result);
  act(() => result.current.handleForceScan());
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(mocks.search.mock.calls[0][8]).toBe(null);
  act(() => result.current.handleForceScan());
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(mocks.search.mock.calls[1][8]).toBe("rotated");
});
