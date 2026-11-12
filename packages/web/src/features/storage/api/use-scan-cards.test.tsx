import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { StorageLocationSearchResult } from "@magic-vault/shared";
import { acquireStorageScanStream, useScanCards } from "./use-scan-cards";

const mocks = vi.hoisted(() => ({
  host: vi.fn(),
  browser: vi.fn(),
  relay: vi.fn(),
  drawRelay: vi.fn(),
  stop: vi.fn(),
  identify: vi.fn(),
  guard: vi.fn(),
  orgId: "org-a",
}));
vi.mock("@/features/companies/api/use-organization", () => ({
  useOrg: () => ({ activeOrg: { id: mocks.orgId } }),
}));
vi.mock("@/features/companies/api/org-settings", () => ({
  orgSettingsQueryOptions: () => ({}),
}));
vi.mock("@/features/collections/api/use-collections", () => ({
  useCollections: () => ({
    collections: [{ guid: "collection", game: { key: "mtg" } }],
  }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: undefined }),
}));
vi.mock("@/features/scanner/lib/camera-stream", () => ({
  acquireStream: mocks.browser,
  stopMediaStream: mocks.stop,
}));
vi.mock("@/features/scanner/lib/pi-camera", () => ({
  acquirePiRelayStream: mocks.relay,
  drawPiRelayFrame: mocks.drawRelay,
}));
vi.mock("@/features/scanner/lib/card-image-search", () => ({
  searchCardImageWithConsensus: mocks.identify,
}));
vi.mock("@/lib/pi-host", () => ({ loadPiHost: mocks.host }));
vi.mock("@/lib/auth/impersonation", () => ({
  assertHardwareAllowedWhileImpersonating: mocks.guard,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.orgId = "org-a";
  mocks.host.mockResolvedValue(false);
  mocks.drawRelay.mockReturnValue(false);
  mocks.identify.mockResolvedValue({ card: { id: "card", name: "Card" } });
});
afterEach(cleanup);

function source() {
  return {
    cards: [
      {
        scanId: "scan",
        collectionGuid: "collection",
        card: { id: "card", name: "Card" },
        locationName: "Shelf",
        position: 3,
      },
    ] as StorageLocationSearchResult[],
    checkedScanIds: new Set<string>(),
    setChecked: vi.fn(),
  };
}
function frame() {
  const video = document.createElement("video");
  Object.defineProperties(video, {
    videoWidth: { value: 640 },
    videoHeight: { value: 480 },
  });
  const canvas = document.createElement("canvas");
  const draw = vi.fn();
  canvas.getContext = vi.fn().mockReturnValue({ drawImage: draw });
  return { video, canvas, draw };
}

it("does not acquire hardware when the hook mounts; acquisition selects the host relay only on request", async () => {
  renderHook(() => useScanCards(source()));
  expect(mocks.browser).not.toHaveBeenCalled();
  expect(mocks.relay).not.toHaveBeenCalled();
  mocks.host.mockResolvedValue(true);
  const stream = {} as MediaStream;
  mocks.relay.mockResolvedValue(stream);
  expect(await acquireStorageScanStream()).toBe(stream);
  expect(mocks.relay).toHaveBeenCalledOnce();
  expect(mocks.browser).not.toHaveBeenCalled();
  expect(mocks.guard).toHaveBeenCalledOnce();
});

it("preserves rear-camera browser acquisition and stops an acquired stream on cancellation", async () => {
  const stream = {} as MediaStream;
  mocks.browser.mockResolvedValue(stream);
  const controller = new AbortController();
  expect(await acquireStorageScanStream(controller.signal)).toBe(stream);
  expect(mocks.browser).toHaveBeenCalledWith(undefined, true);
  controller.abort();
  expect(mocks.stop).toHaveBeenCalledWith(stream);
});

it("stops a relay that resolves after the panel has closed", async () => {
  mocks.host.mockResolvedValue(true);
  let finish: (stream: MediaStream) => void = () => {};
  mocks.relay.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const controller = new AbortController();
  const pending = acquireStorageScanStream(controller.signal);
  const rejected = expect(pending).rejects.toMatchObject({
    name: "AbortError",
  });
  await waitFor(() => expect(mocks.relay).toHaveBeenCalledOnce());
  controller.abort();
  const stream = {} as MediaStream;
  finish(stream);
  await rejected;
  expect(mocks.stop).toHaveBeenCalledWith(stream);
});

it("identifies a host relay frame before video metadata is available and checks the matching stored copy", async () => {
  const input = source();
  const { result } = renderHook(() => useScanCards(input));
  const video = document.createElement("video");
  const stream = {} as MediaStream;
  video.srcObject = stream;
  const canvas = document.createElement("canvas");
  mocks.drawRelay.mockReturnValue(true);
  await act(async () => {
    await result.current.scanVideoFrame(video, canvas);
  });
  expect(mocks.drawRelay).toHaveBeenCalledWith(stream, canvas);
  expect(mocks.identify.mock.calls[0][3]).toEqual({
    collectionGuid: "collection",
  });
  expect(input.setChecked).toHaveBeenCalledWith("scan", true);
  expect(result.current.result).toMatchObject({
    kind: "checked",
    locationName: "Shelf",
    position: 3,
  });
});

it("preserves browser frame capture", async () => {
  const input = source();
  const { result } = renderHook(() => useScanCards(input));
  const { video, canvas, draw } = frame();
  await act(async () => {
    await result.current.scanVideoFrame(video, canvas);
  });
  expect(draw).toHaveBeenCalledWith(video, 0, 0);
  expect(canvas.width).toBe(640);
  expect(input.setChecked).toHaveBeenCalledWith("scan", true);
});

it("ignores identification after unmount and prevents late redraws", async () => {
  const input = source();
  let finish: (value: unknown) => void = () => {};
  mocks.identify.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { result, unmount } = renderHook(() => useScanCards(input));
  const { video, canvas, draw } = frame();
  let pending: Promise<void>;
  act(() => {
    pending = result.current.scanVideoFrame(video, canvas);
  });
  await waitFor(() => expect(mocks.identify).toHaveBeenCalledOnce());
  const redraw = mocks.identify.mock.calls[0][1];
  unmount();
  draw.mockClear();
  redraw();
  finish({ card: { id: "card", name: "Card" } });
  await pending!;
  expect(draw).not.toHaveBeenCalled();
  expect(input.setChecked).not.toHaveBeenCalled();
});

it("drops a delayed identification when the active organization changes", async () => {
  const input = source();
  let finish: (value: unknown) => void = () => {};
  mocks.identify.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { result, rerender } = renderHook(() => useScanCards(input));
  const { video, canvas } = frame();
  let pending: Promise<void>;
  act(() => {
    pending = result.current.scanVideoFrame(video, canvas);
  });
  await waitFor(() => expect(mocks.identify).toHaveBeenCalledOnce());
  mocks.orgId = "org-b";
  rerender();
  await act(async () => {
    finish({ card: { id: "card", name: "Card" } });
    await pending!;
  });
  expect(input.setChecked).not.toHaveBeenCalled();
  expect(result.current.result).toBeNull();
});
