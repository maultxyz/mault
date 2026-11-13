import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ScanRemovalProvider, useScanRemoval } from "./use-scan-removal";
import { updatePiScanRemoval, updatePiScanSettings } from "./pi-scan-session";
import { applyPiScanState, getPiScanState } from "../lib/pi-scan-store";
import { IDLE_PI_SCAN_SESSION } from "@/lib/constants/scanner";
import type {
  PiScanSessionState,
  PlayingCardWithDistance,
} from "@magic-vault/shared";

const mocks = vi.hoisted(() => ({
  removeCards: vi.fn(),
  setHandScan: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));
vi.mock("@/hooks/use-pi-host", () => ({ usePiHost: () => true }));
vi.mock("@/features/collections/api/use-collections", () => ({
  useCollections: () => ({ activeCollection: { guid: "collection" } }),
}));
vi.mock("@/features/bins/api/use-bin-configs", () => ({
  useBinConfigs: () => ({ configs: [{ binNumber: 1, isCatchAll: true }] }),
}));
vi.mock("./use-scanned-cards", () => ({
  useScannedCards: () => ({
    removeCards: mocks.removeCards,
    sendCardToBin: vi.fn(),
    sendCatchAllBin: vi.fn(),
  }),
}));
vi.mock("./use-serial", () => ({ useSerial: () => ({ isConnected: false }) }));
vi.mock("./use-station-toast", () => ({
  useStationToast: () => ({ error: mocks.error, success: mocks.success }),
}));
vi.mock("../lib/hand-scan", () => ({
  useHandScan: () => [false, mocks.setHandScan],
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("../lib/pi-scan-store", () => ({
  getPiScanState: vi.fn(),
  applyPiScanState: vi.fn(),
  subscribePiScan: () => () => {},
}));
vi.mock("./pi-scan-session", () => ({
  piScanHoldsPort: (state: PiScanSessionState) =>
    ["running", "paused"].includes(state.phase),
  updatePiScanSettings: vi.fn(),
  updatePiScanRemoval: vi.fn(),
}));

const card = { id: "printing", name: "Card" } as PlayingCardWithDistance;
const state: PiScanSessionState = {
  ...IDLE_PI_SCAN_SESSION,
  phase: "running",
  collectionGuid: "collection",
  removalEnabled: true,
  removalBinNumber: 1,
  removalEntries: [
    {
      entryId: "entry",
      matchedCard: card,
      selectedScanId: "copy",
      copies: [{ scanId: "copy", card, scannedAt: 1 }],
    },
  ],
};
const render = () =>
  renderHook(() => useScanRemoval(), { wrapper: ScanRemovalProvider });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPiScanState).mockReturnValue(state);
  vi.mocked(updatePiScanSettings).mockResolvedValue({
    success: true,
    data: state,
  });
  vi.mocked(updatePiScanRemoval).mockResolvedValue({
    success: true,
    data: { ...state, removalEntries: [] },
  });
});
afterEach(cleanup);

it("reconnects to the authoritative host removal queue without writing browser defaults", () => {
  const first = render();
  expect(first.result.current.isRemoveModeEnabled).toBe(true);
  expect(first.result.current.isSorterConnected).toBe(true);
  expect(first.result.current.entries).toEqual(state.removalEntries);
  first.unmount();
  const reconnected = render();
  expect(reconnected.result.current.queuedCount).toBe(1);
  expect(updatePiScanSettings).not.toHaveBeenCalled();
  expect(updatePiScanRemoval).not.toHaveBeenCalled();
  expect(mocks.setHandScan).not.toHaveBeenCalled();
});

it("explicit mode edits patch the host without switching its observing browser into local hand scanning", async () => {
  const { result } = render();
  act(() => result.current.setRemoveModeEnabled(false));
  expect(updatePiScanSettings).toHaveBeenCalledExactlyOnceWith({
    removalEnabled: false,
  });
  await waitFor(() => expect(applyPiScanState).toHaveBeenCalledWith(state));
  expect(mocks.setHandScan).not.toHaveBeenCalled();
});

it("removes the host queue through its authenticated action instead of a browser-local card list", async () => {
  const { result } = render();
  await act(() => result.current.removeQueuedCards());
  expect(updatePiScanRemoval).toHaveBeenCalledExactlyOnceWith({
    action: "remove",
  });
  expect(mocks.removeCards).not.toHaveBeenCalled();
  expect(applyPiScanState).toHaveBeenCalledWith({
    ...state,
    removalEntries: [],
  });
});

it("keeps the queue visible after host scanning stops so the user can still review and remove it", () => {
  vi.mocked(getPiScanState).mockReturnValue({ ...state, phase: "stopped" });
  const { result } = render();
  expect(result.current.entries).toEqual(state.removalEntries);
  expect(result.current.queuedCount).toBe(1);
});
