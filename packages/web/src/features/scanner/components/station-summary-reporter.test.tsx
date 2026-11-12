import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { SorterControl } from "@/lib/interfaces/stations";
import { StationSummaryReporter } from "./station-summary-reporter";

const mocks = vi.hoisted(() => ({
  piHost: true,
  station: { id: "first", deviceGuid: "device" },
  state: {
    phase: "running",
    stopping: false,
    collectionGuid: "host-collection",
  },
  browserRunning: false,
  serialReady: false,
  browserPause: vi.fn(),
  browserResume: vi.fn(),
  hostPause: vi.fn(),
  hostResume: vi.fn(),
  apply: vi.fn(),
  register: vi.fn(),
  unregister: vi.fn(),
  summary: vi.fn(),
  query: vi.fn(),
}));
vi.mock("@/features/collections/api/collection-cards", () => ({
  collectionCardsSummaryQueryOptions: (guid: string | undefined) => {
    mocks.query(guid);
    return { guid };
  },
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ guid }: { guid: string | undefined }) => ({
    data: { all: { totalCount: guid === "host-collection" ? 12 : 5 } },
  }),
}));
vi.mock("@/features/collections/api/use-collections", () => ({
  useCollections: () => ({
    activeCollection: {
      guid: "browser-collection",
      name: "Browser collection",
    },
    collections: [
      { guid: "host-collection", name: "Host collection" },
      { guid: "browser-collection", name: "Browser collection" },
    ],
  }),
}));
vi.mock("@/features/scanner/api/use-scanned-cards", () => ({
  useScannedCards: () => ({
    isTimerActive: mocks.browserRunning,
    pause: mocks.browserPause,
    resume: mocks.browserResume,
    attention: null,
  }),
}));
vi.mock("@/features/scanner/api/use-serial", () => ({
  useSerial: () => ({ isReady: mocks.serialReady }),
}));
vi.mock("@/features/scanner/api/use-sorter-selection", () => ({
  useSorterSelection: () => ({ registerSorterControl: mocks.register }),
}));
vi.mock("@/features/scanner/api/use-stations", () => ({
  useStation: () => ({ station: mocks.station }),
  useStations: () => ({ stations: [{ id: "first" }, { id: "second" }] }),
}));
vi.mock("@/features/scanner/lib/station-summary-store", () => ({
  setStationSummary: mocks.summary,
}));
vi.mock("@/hooks/use-pi-host", () => ({ usePiHost: () => mocks.piHost }));
vi.mock("@/features/scanner/api/pi-scan-session", () => ({
  pausePiScanSession: mocks.hostPause,
  resumePiScanSession: mocks.hostResume,
}));
vi.mock("@/features/scanner/lib/pi-scan-store", () => ({
  getPiScanState: () => mocks.state,
  subscribePiScan: () => () => {},
  applyPiScanState: mocks.apply,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.piHost = true;
  mocks.station = { id: "first", deviceGuid: "device" };
  mocks.state = {
    phase: "running",
    stopping: false,
    collectionGuid: "host-collection",
  };
  mocks.browserRunning = false;
  mocks.serialReady = false;
  mocks.register.mockReturnValue(mocks.unregister);
  mocks.hostPause.mockResolvedValue({
    success: true,
    data: { phase: "paused" },
  });
  mocks.hostResume.mockResolvedValue({
    success: true,
    data: { phase: "running" },
  });
});
afterEach(cleanup);
function control(): SorterControl {
  return mocks.register.mock.calls.at(-1)![1];
}

it("reports authoritative host running state and collection while the browser timer and serial are inactive", async () => {
  render(<StationSummaryReporter />);
  expect(control()).toMatchObject({ isRunning: true, canResume: false });
  expect(mocks.query).toHaveBeenLastCalledWith("host-collection");
  expect(mocks.summary).toHaveBeenCalledWith("first", {
    isRunning: true,
    totalCount: 12,
    collectionName: "Host collection",
  });
  act(() => control().pause());
  await waitFor(() => expect(mocks.hostPause).toHaveBeenCalledOnce());
  expect(mocks.browserPause).not.toHaveBeenCalled();
  expect(mocks.apply).toHaveBeenCalledWith({ phase: "paused" });
});

it("resumes a paused host session even when the browser timer is running and browser serial is held", async () => {
  mocks.state = { ...mocks.state, phase: "paused" };
  mocks.browserRunning = true;
  render(<StationSummaryReporter />);
  expect(control()).toMatchObject({ isRunning: false, canResume: true });
  act(() => control().resume());
  await waitFor(() => expect(mocks.hostResume).toHaveBeenCalledOnce());
  expect(mocks.browserResume).not.toHaveBeenCalled();
  expect(mocks.apply).toHaveBeenCalledWith({ phase: "running" });
});

it.each(["idle", "stopped", "error"])(
  "does not resume or report browser activity for a %s host session",
  (phase) => {
    mocks.state = { ...mocks.state, phase };
    mocks.browserRunning = true;
    render(<StationSummaryReporter />);
    expect(control()).toMatchObject({ isRunning: false, canResume: false });
    act(() => {
      control().pause();
      control().resume();
    });
    expect(mocks.hostPause).not.toHaveBeenCalled();
    expect(mocks.hostResume).not.toHaveBeenCalled();
    expect(mocks.browserPause).not.toHaveBeenCalled();
    expect(mocks.browserResume).not.toHaveBeenCalled();
  },
);

it("disables host pause and resume while a stop is already draining", () => {
  mocks.state = { ...mocks.state, stopping: true };
  render(<StationSummaryReporter />);
  expect(control()).toMatchObject({ isRunning: false, canResume: false });
  act(() => {
    control().pause();
    control().resume();
  });
  expect(mocks.hostPause).not.toHaveBeenCalled();
  expect(mocks.hostResume).not.toHaveBeenCalled();
});

it("preserves browser station timer, readiness, collection and controls outside Pi hosting", () => {
  mocks.piHost = false;
  mocks.browserRunning = true;
  mocks.serialReady = true;
  const { rerender } = render(<StationSummaryReporter />);
  expect(control()).toMatchObject({ isRunning: true, canResume: false });
  expect(mocks.summary).toHaveBeenCalledWith("first", {
    isRunning: true,
    totalCount: 5,
    collectionName: "Browser collection",
  });
  act(() => control().pause());
  expect(mocks.browserPause).toHaveBeenCalledOnce();
  mocks.browserRunning = false;
  rerender(<StationSummaryReporter />);
  expect(control().canResume).toBe(true);
  act(() => control().resume());
  expect(mocks.browserResume).toHaveBeenCalledOnce();
  expect(mocks.hostPause).not.toHaveBeenCalled();
  expect(mocks.hostResume).not.toHaveBeenCalled();
});

it("does not duplicate the single host session into a second station", () => {
  mocks.station = { id: "second", deviceGuid: "second-device" };
  mocks.serialReady = true;
  render(<StationSummaryReporter />);
  expect(mocks.register).toHaveBeenLastCalledWith(
    "second-device",
    expect.objectContaining({ isRunning: false, canResume: true }),
  );
  expect(mocks.summary).toHaveBeenCalledWith("second", {
    isRunning: false,
    totalCount: 5,
    collectionName: "Browser collection",
  });
  act(() => control().resume());
  expect(mocks.browserResume).toHaveBeenCalledOnce();
  expect(mocks.hostResume).not.toHaveBeenCalled();
});

it("unregisters controls and removes the summary on unmount", () => {
  const { unmount } = render(<StationSummaryReporter />);
  unmount();
  expect(mocks.unregister).toHaveBeenCalledOnce();
  expect(mocks.summary).toHaveBeenLastCalledWith("first", null);
});
