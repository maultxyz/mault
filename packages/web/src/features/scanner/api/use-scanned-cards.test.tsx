import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ScannedCardsProvider, useScannedCards } from "./use-scanned-cards";
import type { PlayingCardWithDistance } from "@magic-vault/shared";

const mocks = vi.hoisted(() => ({
  collection: {
    guid: "collection",
    game: { guid: "game", key: "mtg", foilTypes: [] },
  },
  configs: [
    {
      guid: "bin",
      binNumber: 1,
      isCatchAll: true,
      lastEmptiedAt: null as number | null,
      rules: { operator: "and", conditions: [] },
    },
  ],
  selectedSet: { scanOnly: true, scanOnlyBin: 1, skipSaving: false },
  levels: [{ binNumber: 1, count: 0, capacity: 1 }],
  countsUpdatedAt: 0,
  route: vi.fn(),
  save: vi.fn(),
  saveUnmatched: vi.fn(),
  sortOnly: vi.fn(),
  pause: vi.fn(),
  sound: vi.fn(),
  queryClient: {
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
    getQueryData: vi.fn(),
  },
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
  },
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@tanstack/react-query", () => ({
  queryOptions: (value: unknown) => value,
  useQuery: () => ({ data: undefined }),
  useQueryClient: () => mocks.queryClient,
}));
vi.mock("@/features/billing/api/billing", () => ({
  billingQueryOptions: () => ({ queryKey: ["billing"] }),
}));
vi.mock("@/features/billing/lib/support-prompt", () => ({
  recordSupportPromptScan: vi.fn(),
}));
vi.mock("@/features/bins/api/use-bin-configs", () => ({
  useBinConfigs: () => ({
    configs: mocks.configs,
    ruleFieldDefinitions: [
      {
        field: "name",
        label: "Name",
        type: "string",
        path: "name",
        operators: [],
      },
    ],
    selectedSet: mocks.selectedSet,
    save: vi.fn(),
    saveUnmatched: vi.fn(),
    emptyBin: vi.fn(),
  }),
}));
vi.mock("@/features/bins/api/use-pick-list", () => ({
  recordPickListFound: vi.fn(),
}));
vi.mock("@/features/calibration/api/use-feeder-config", () => ({
  useFeederConfig: () => ({ feederConfig: { feedRetryCount: 0 } }),
}));
vi.mock("@/features/calibration/api/use-bin-routes", () => ({
  useBinRoutes: () => ({
    routes: [{ binNumber: 1, module: 1, direction: "left" }],
  }),
}));
vi.mock("@/features/calibration/api/use-device", () => ({
  useDevice: () => ({ guid: "device" }),
}));
vi.mock("@/features/collections/api/use-collections", () => ({
  useCollections: () => ({ activeCollection: mocks.collection }),
}));
vi.mock("@/features/collections/api/collection-cards", () => ({
  loadBinContents: async () => [],
}));
vi.mock("@/features/collections/api/collections", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  loadUnmatchedCards: async () => ({ data: { cards: [], total: 0 } }),
  releaseScanLock: async () => {},
  recordSortOnlyScan: mocks.sortOnly,
}));
vi.mock("@/features/collections/lib/card-page-cache", () => ({
  invalidateCollectionCards: vi.fn(),
  invalidateBinCounts: vi.fn(),
  invalidateUnmatchedCards: vi.fn(),
}));
vi.mock("@/features/companies/api/org-settings", () => ({
  orgSettingsQueryOptions: () => ({}),
}));
vi.mock("@/features/companies/api/use-organization", () => ({
  useOrg: () => ({ activeOrg: { id: "org" } }),
}));
vi.mock("./use-pi-scan-settings", () => ({ usePiScanSettings: () => ({}) }));
vi.mock("./use-auto-feed", () => ({
  useAutoFeed: () => ({
    pause: mocks.pause,
    resume: vi.fn(),
    isAutoFeedEnabled: () => false,
    isPipelinedFeedEnabled: () => false,
  }),
}));
vi.mock("./use-deploy-pause", () => ({ useDeployScanPause: vi.fn() }));
vi.mock("./use-computed-bin-fill-levels", () => ({
  useComputedBinFillLevels: () => ({
    levels: mocks.levels,
    countsUpdatedAt: mocks.countsUpdatedAt,
  }),
}));
vi.mock("./use-jam-toast", () => ({ useJamToast: () => vi.fn() }));
vi.mock("./use-pending-scan-saves", () => ({
  usePendingScanSaves: () => ({
    saveCard: mocks.save,
    saveUnmatched: mocks.saveUnmatched,
  }),
}));
vi.mock("@/hooks/use-pi-host", () => ({ usePiHost: () => false }));
vi.mock("./use-session-monitor", () => ({ useSessionMonitor: () => ({}) }));
vi.mock("./use-scan-timer", () => ({ useScanTimer: () => ({ elapsedMs: 0 }) }));
vi.mock("./use-serial", () => ({
  useSerial: () => ({
    isConnected: true,
    isReady: true,
    sendRoute: vi.fn(),
    sendRequest: vi.fn(),
  }),
}));
vi.mock("./use-stations", () => ({
  useStations: () => ({ sorterLimitIsHardCap: false }),
}));
vi.mock("./use-station-toast", () => ({ useStationToast: () => mocks.toast }));
vi.mock("../components/bin-correction-dialog", () => ({
  BinCorrectionDialog: () => null,
}));
vi.mock("../lib/route-card-to-bin", () => ({ routeCardToBin: mocks.route }));
vi.mock("../lib/ignore-ir-sensors", () => ({
  useIgnoreIrSensors: () => [false],
}));
vi.mock("@/features/sounds/api/use-sound-rule-player", () => ({
  useSoundRulePlayer: () => mocks.sound,
}));
vi.mock("@/lib/app-stream", () => ({
  useCollectionLocks: () => ({ locks: {}, currentUserId: "user" }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(mocks.selectedSet, {
    scanOnly: true,
    isRepackMode: false,
    skipSaving: false,
  });
  mocks.configs[0].isCatchAll = true;
  mocks.configs[0].lastEmptiedAt = null;
  mocks.levels[0].capacity = 1;
  mocks.levels[0].count = 0;
  mocks.countsUpdatedAt = 0;
  mocks.route.mockResolvedValue(undefined);
  mocks.save.mockResolvedValue({ success: true });
  mocks.saveUnmatched.mockResolvedValue({ success: true });
  mocks.sortOnly.mockResolvedValue({ success: true });
});
afterEach(cleanup);
const card = {
  id: "card",
  name: "Card",
  foilTypes: [],
} as unknown as PlayingCardWithDistance;
function mount() {
  return renderHook(() => useScannedCards(), { wrapper: ScannedCardsProvider });
}

it("reserves capacity before routing can feed the next scan and persists after routing", async () => {
  let finishRoute: () => void = () => {};
  mocks.route.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finishRoute = resolve;
      }),
  );
  const { result } = mount();
  act(() => result.current.addCard(card));
  await waitFor(() => expect(mocks.route).toHaveBeenCalledOnce());
  expect(mocks.save).not.toHaveBeenCalled();
  act(() => result.current.addCard(card));
  await waitFor(() => expect(mocks.pause).toHaveBeenCalled());
  expect(mocks.route).toHaveBeenCalledOnce();
  await act(async () => finishRoute());
  await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
});

it("a full destination pauses before routing or persistence", async () => {
  mocks.levels[0].count = 1;
  const { result } = mount();
  act(() => result.current.addCard(card));
  await waitFor(() => expect(mocks.pause).toHaveBeenCalledOnce());
  expect(mocks.route).not.toHaveBeenCalled();
  expect(mocks.save).not.toHaveBeenCalled();
});

it("sort-only scans record the outcome after routing without saving a collection card", async () => {
  mocks.selectedSet.skipSaving = true;
  const { result } = mount();
  act(() => result.current.addCard(card));
  await waitFor(() => expect(mocks.sortOnly).toHaveBeenCalledOnce());
  expect(mocks.route).toHaveBeenCalledOnce();
  expect(mocks.save).not.toHaveBeenCalled();
});

it("unmatched scans reserve the catch-all before routing and save afterward", async () => {
  let finishRoute: () => void = () => {};
  mocks.route.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finishRoute = resolve;
      }),
  );
  const { result } = mount();
  act(() => result.current.addUnmatchedCard("image"));
  await waitFor(() => expect(mocks.route).toHaveBeenCalledOnce());
  expect(mocks.saveUnmatched).not.toHaveBeenCalled();
  act(() => result.current.addUnmatchedCard("image"));
  await waitFor(() => expect(mocks.pause).toHaveBeenCalled());
  expect(mocks.route).toHaveBeenCalledOnce();
  await act(async () => finishRoute());
  await waitFor(() => expect(mocks.saveUnmatched).toHaveBeenCalledOnce());
});

it("unmatched sort-only scans reserve the catch-all while skipping persistence", async () => {
  mocks.selectedSet.skipSaving = true;
  const { result } = mount();
  act(() => result.current.addUnmatchedCard("image"));
  await waitFor(() => expect(mocks.route).toHaveBeenCalledOnce());
  expect(mocks.saveUnmatched).not.toHaveBeenCalled();
  expect(mocks.sortOnly).not.toHaveBeenCalled();
  act(() => result.current.addUnmatchedCard("image"));
  await waitFor(() => expect(mocks.pause).toHaveBeenCalledOnce());
  expect(mocks.route).toHaveBeenCalledOnce();
});

it("a database count refresh retains the capacity occupied by sort-only cards", async () => {
  mocks.selectedSet.skipSaving = true;
  const { result, rerender } = mount();
  act(() => result.current.addCard(card));
  await waitFor(() => expect(mocks.sortOnly).toHaveBeenCalledOnce());
  mocks.countsUpdatedAt = Date.now() + 1000;
  rerender();
  act(() => result.current.addCard(card));
  await waitFor(() => expect(mocks.pause).toHaveBeenCalledOnce());
  expect(mocks.route).toHaveBeenCalledOnce();
});

it("emptying a bin releases the capacity occupied by sort-only cards", async () => {
  mocks.selectedSet.skipSaving = true;
  const { result, rerender } = mount();
  act(() => result.current.addCard(card));
  await waitFor(() => expect(mocks.sortOnly).toHaveBeenCalledOnce());
  mocks.configs[0].lastEmptiedAt = Date.now() + 1;
  rerender();
  act(() => result.current.addCard(card));
  await waitFor(() => expect(mocks.sortOnly).toHaveBeenCalledTimes(2));
  expect(mocks.pause).not.toHaveBeenCalled();
});

it("finishing the final repack pauses feeding while routing and saving that card", async () => {
  Object.assign(mocks.selectedSet, {
    scanOnly: false,
    isRepackMode: true,
    repackSlots: [
      {
        id: "slot",
        targetCount: 1,
        rule: {
          id: "rule",
          combinator: "and",
          conditions: [
            { id: "name", field: "name", operator: "equals", value: "Card" },
          ],
        },
      },
    ],
    repackUniqueBy: null,
    repackSiftRules: null,
  });
  mocks.configs[0].isCatchAll = false;
  mocks.levels[0].capacity = 10;
  const { result } = mount();
  await act(async () => {});
  act(() => result.current.addCard(card));
  await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
  expect(mocks.pause).toHaveBeenCalled();
  expect(mocks.route).toHaveBeenCalledOnce();
});

it("two captures delivered in one tick reserve capacity before the second plan", async () => {
  const { result } = mount();
  act(() => {
    result.current.addCard(card);
    result.current.addCard(card);
  });
  await waitFor(() => expect(mocks.pause).toHaveBeenCalledOnce());
  await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
  expect(mocks.route).toHaveBeenCalledOnce();
});
