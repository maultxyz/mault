import { OrderBatchPick } from "@/features/business/components/order-batch-pick";
import type {
  FulfilmentOrderDetail,
  PullSheetEntry,
} from "@magic-vault/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const updateOrderMock = vi.fn().mockResolvedValue({ success: true });
const createSorterPickRunMock = vi.fn().mockResolvedValue({
  success: true,
  data: { presets: [{ guid: "preset-1", name: "Box A", gameKey: "mtg" }] },
});
const applySorterPickRunMock = vi.fn().mockResolvedValue({
  success: true,
  data: { pickedByOrder: { o1: ["a"] } },
});
const createPickRunSortPresetMock = vi.fn().mockResolvedValue({
  success: true,
  data: {
    presets: [{ guid: "preset-2", name: "Order 1, Order 2", gameKey: "mtg" }],
  },
});
const deleteSetMock = vi.fn().mockResolvedValue({ success: true, data: [] });
const releaseSorterPickMissingMock = vi.fn().mockResolvedValue({
  success: true,
  data: { released: true, unfiled: true },
});
const previousPresetsMock = [
  { guid: "preset-prev", name: "Older run", gameKey: "mtg", createdAt: "" },
];

vi.mock("@/features/business/components/pick-sorter-select", () => ({
  PickSorterSelect: () => null,
}));

vi.mock("@/features/bins/api/sort-bins", () => ({
  binsQueryOptions: { queryKey: ["bins"] },
  deleteSet: (...args: unknown[]) => deleteSetMock(...args),
}));

vi.mock("@/features/bins/api/sort-bins", () => ({
  binsQueryOptions: { queryKey: ["bins"] },
  deleteSet: (...args: unknown[]) => deleteSetMock(...args),
}));

vi.mock("@/features/storage/api/storage-locations", () => ({
  storageLocationCardPageQueryOptions: (guid: string, _q: unknown, page: number) => ({
    queryKey: ["storage-cards", guid, page],
    queryFn: async () => ({
      cards: [
        {
          scanId: "a",
          position: 1,
          card: { name: "Alpha", set: "a", setName: "Set A", collectorNumber: "1", image: null },
          isFoil: false,
          condition: "NM",
        },
        {
          scanId: "zz",
          position: 2,
          card: { name: "Zulu", set: "z", setName: "Set Z", collectorNumber: "9", image: null },
          isFoil: false,
          condition: "LP",
        },
      ],
      total: 2,
      page: 1,
      pageSize: 500,
    }),
  }),
}));

vi.mock("@/features/business/api/business", () => ({
  businessKeys: {
    root: () => ["business"],
    order: (guid: string) => ["business", "order", guid],
    ordersRoot: () => ["business", "orders"],
  },
  orderQueryOptions: (guid: string) => ({
    queryKey: ["business", "order", guid],
    queryFn: async () => mockOrders[guid],
  }),
  setOrderPicked: vi.fn().mockResolvedValue({ success: true, data: null }),
  updateOrder: (...args: unknown[]) => updateOrderMock(...args),
  fulfilOrder: vi.fn().mockResolvedValue({ success: true, data: null }),
  createSorterPickRun: (...args: unknown[]) => createSorterPickRunMock(...args),
  applySorterPickRun: (...args: unknown[]) => applySorterPickRunMock(...args),
  createPickRunSortPreset: (...args: unknown[]) =>
    createPickRunSortPresetMock(...args),
  previousSortPresetsQueryOptions: (orderGuids: string[]) => ({
    queryKey: ["business", "orders", "previousPresets", orderGuids],
    queryFn: async () => previousPresetsMock,
  }),
  releaseSorterPickMissing: (...args: unknown[]) =>
    releaseSorterPickMissingMock(...args),
}));

vi.mock("@/features/business/api/use-business", () => ({
  useBusinessAccess: () => ({ access: { canFulfilOrders: true } }),
  useBusinessAction:
    () =>
    async <T,>(action: () => Promise<T>) =>
      action(),
}));

function entry(
  overrides: Partial<PullSheetEntry> & { scanId: string },
): PullSheetEntry {
  return {
    lineIndex: 0,
    card: {
      id: "card-x",
      name: "Card",
      set: "m10",
      setName: "Magic 2010",
      collectorNumber: "1",
      image: null,
    },
    isFoil: false,
    condition: "NM",
    collectionGuid: "c1",
    collectionName: "Inventory",
    binNumber: null,
    locationName: null,
    locationPosition: null,
    picked: false,
    orderRef: null,
    gameKey: "mtg",
    ...overrides,
  } as PullSheetEntry;
}

const mockOrders: Record<string, FulfilmentOrderDetail> = {
  o1: {
    guid: "o1",
    name: "Order 1",
    source: "generic",
    status: "open",
    lineCount: 2,
    quantity: 2,
    allocated: 2,
    picked: 0,
    revenue: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    closedAt: null,
    createdByName: null,
    lines: [
      { name: "A", quantity: 1, allocations: ["a"], picked: [], orderRef: "REF-1" },
      { name: "B", quantity: 1, allocations: ["c"], picked: [] },
    ],
    pullSheet: [
      entry({
        scanId: "a",
        card: {
          id: "x",
          name: "Alpha",
          set: "a",
          setName: "Set A",
          collectorNumber: "1",
          image: null,
        } as PullSheetEntry["card"],
        locationName: "Box A",
        locationGuid: "loc-1",
        locationPosition: 0,
        orderRef: "REF-1",
      }),
      entry({
        scanId: "b",
        card: {
          id: "y",
          name: "Bravo",
          set: "b",
          setName: "Set B",
          collectorNumber: "2",
          image: null,
        } as PullSheetEntry["card"],
        locationName: "Box B",
        locationGuid: "loc-2",
        locationPosition: 2,
      }),
    ],
    orderBins: { "REF-1": 2 },
    binCount: 8,
  },
  o2: {
    guid: "o2",
    name: "Order 2",
    source: "generic",
    status: "open",
    lineCount: 1,
    quantity: 1,
    allocated: 1,
    picked: 0,
    revenue: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    closedAt: null,
    createdByName: null,
    lines: [{ name: "C", quantity: 1, allocations: ["c"], picked: [] }],
    pullSheet: [
      entry({
        scanId: "c",
        card: {
          id: "z",
          name: "Charlie",
          set: "c",
          setName: "Set C",
          collectorNumber: "3",
          image: null,
        } as PullSheetEntry["card"],
        locationName: "Box A",
        locationGuid: "loc-1",
        locationPosition: 5,
      }),
      entry({
        scanId: "d",
        card: {
          id: "w",
          name: "Delta",
          set: "d",
          setName: "Set D",
          collectorNumber: "4",
          image: null,
        } as PullSheetEntry["card"],
        binNumber: 3,
      }),
    ],
    orderBins: {},
    binCount: 8,
  },
};

function renderBatch() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <OrderBatchPick orderGuids={["o1", "o2"]} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function heroSection() {
  const caption = await screen.findByText("orders.pickWalk.nextUp");
  return caption.closest("section")!;
}

describe("OrderBatchPick", () => {
  beforeEach(() => {
    updateOrderMock.mockClear();
    createSorterPickRunMock.mockClear();
    applySorterPickRunMock.mockClear();
    createPickRunSortPresetMock.mockClear();
    deleteSetMock.mockClear();
    releaseSorterPickMissingMock.mockClear();
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    );
    try {
      sessionStorage.clear();
    } catch {}
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the first unpicked card as next up and groups stops in walk order", async () => {
    renderBatch();
    const hero = await heroSection();
    expect(within(hero).getByText("Alpha")).toBeTruthy();
    expect(within(hero).getByText("Box A")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Box A/ })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Box B/ })).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: /orders\.pickWalk\.collectionBin/ }),
    ).toBeTruthy();
    expect(
      screen.getAllByText("orders.pickWalk.stopProgress").length,
    ).toBe(3);
  });

  it("picks from the next up card and advances to the following card", async () => {
    renderBatch();
    const hero = await heroSection();
    fireEvent.click(
      within(hero).getByRole("button", { name: "orders.pickCopyForOrder" }),
    );
    await waitFor(async () => {
      expect(within(await heroSection()).getByText("Charlie")).toBeTruthy();
    });
    const alphaRow = screen.getByRole("button", {
      name: "orders.pickCopyForOrder",
    });
    expect(alphaRow.getAttribute("aria-pressed")).toBe("true");
  });

  it("releases a copy back to stock through the can't find flow", async () => {
    renderBatch();
    const hero = await heroSection();
    fireEvent.click(
      within(hero).getByRole("button", {
        name: "orders.pickWalk.cantFindCard",
      }),
    );
    expect(
      await screen.findByText("orders.pickWalk.missingTitle"),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "orders.pickWalk.missingConfirm" }),
    );
    await waitFor(() => {
      expect(updateOrderMock).toHaveBeenCalledWith(
        "o1",
        expect.objectContaining({ releasedScanIds: ["a"] }),
      );
    });
  });

  it("marks every card picked and offers completing the picks", async () => {
    renderBatch();
    within(await heroSection()).getByText("Alpha");
    for (const nextName of ["Bravo", "Charlie", "Delta", null]) {
      const hero = await heroSection();
      fireEvent.click(
        within(hero).getByRole("button", { name: /orders\.pickCopy/ }),
      );
      if (nextName) {
        await screen.findByText(nextName);
      }
    }
    await waitFor(() => {
      expect(screen.getByText("orders.pickWalk.allPicked")).toBeTruthy();
    });
    expect(
      screen.getAllByRole("button", { name: "orders.batch.complete" }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("groups picked cards per order in the sort to orders view and supports unpicking", async () => {
    renderBatch();
    const hero = await heroSection();
    fireEvent.click(
      within(hero).getByRole("button", { name: "orders.pickCopyForOrder" }),
    );
    await screen.findByText("Bravo");
    fireEvent.click(screen.getByRole("button", { name: "orders.batch.sortTab" }));
    const [group] = await screen.findAllByRole("region", {
      name: "orders.batch.sortGroupLabel",
    });
    expect(within(group).getAllByText("Alpha").length).toBe(1);
    expect(within(group).getByText("orders.orderRefLabel")).toBeTruthy();
    expect(within(group).getByText("orders.pickWalk.slot")).toBeTruthy();
    fireEvent.click(
      within(group).getByRole("button", { name: "orders.batch.unpick" }),
    );
    await waitFor(() => {
      expect(
        screen.getAllByText("orders.batch.sortStillToPick").length,
      ).toBe(3);
    });
    fireEvent.click(screen.getByRole("button", { name: "orders.batch.walkTab" }));
    expect(screen.getByRole("button", { name: "orders.batch.walkTab" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("offers a list only view without the next up hero", async () => {
    renderBatch();
    await heroSection();
    fireEvent.click(screen.getByRole("button", { name: "orders.batch.listTab" }));
    await waitFor(() => {
      expect(screen.queryByText("orders.pickWalk.nextUp")).toBeNull();
    });
    expect(screen.getByRole("button", { name: "orders.pickCopyForOrder" })).toBeTruthy();
  });

  it("picks and skips in the focus view and returns to picking", async () => {
    renderBatch();
    await heroSection();
    fireEvent.click(screen.getByRole("button", { name: "orders.batch.focusTab" }));
    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeTruthy();
    });
    fireEvent.click(
      screen.getByRole("button", { name: "orders.pickCopyForOrder" }),
    );
    await waitFor(() => {
      expect(screen.getByText("Charlie")).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "orders.batch.focusSkip" }));
    await waitFor(() => {
      expect(screen.getByText("Bravo")).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "orders.batch.walkTab" }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "orders.batch.focusSkip" })).toBeNull();
    });
  });

  it("picks by swiping right in the focus view", async () => {
    renderBatch();
    await heroSection();
    fireEvent.click(screen.getByRole("button", { name: "orders.batch.focusTab" }));
    const stage = await screen.findByText("Alpha");
    const swipeArea = stage.closest("div")!.parentElement!;
    fireEvent.touchStart(swipeArea, {
      touches: [{ clientX: 100 }],
    });
    fireEvent.touchMove(swipeArea, {
      touches: [{ clientX: 220 }],
    });
    fireEvent.touchEnd(swipeArea);
    await waitFor(() => {
      expect(screen.getByText("Charlie")).toBeTruthy();
    });
  });

  it("shows every card of the current container with picks highlighted", async () => {
    renderBatch();
    await heroSection();
    fireEvent.click(screen.getByRole("button", { name: "orders.batch.boxTab" }));
    expect(
      await screen.findByText("Zulu"),
    ).toBeTruthy();
    const alphaRow = screen
      .getByRole("button", { name: "orders.pickCopy" })
      .closest("button")!;
    expect(alphaRow.getAttribute("aria-pressed")).toBe("false");
    const zuluRow = screen.getByText("Zulu").closest("button")!;
    expect(zuluRow.getAttribute("disabled")).not.toBeNull();
    fireEvent.click(alphaRow);
    await waitFor(() => {
      expect(alphaRow.getAttribute("aria-pressed")).toBe("true");
    });
  });

  it("remembers the batch so the picks list can offer to return to it", async () => {
    renderBatch();
    await heroSection();
    await waitFor(() => {
      expect(sessionStorage.getItem("pick-batch:active")).toBe(
        JSON.stringify(["o1", "o2"]),
      );
    });
  });

  it("forgets the batch once none of its orders is open any more", async () => {
    sessionStorage.setItem("pick-batch:active", JSON.stringify(["o1", "o2"]));
    for (const order of Object.values(mockOrders)) order.status = "fulfilled";
    renderBatch();
    await screen.findByText("orders.batch.emptyTitle");
    await waitFor(() => {
      expect(sessionStorage.getItem("pick-batch:active")).toBeNull();
    });
    for (const order of Object.values(mockOrders)) order.status = "open";
  });

  it("runs a grouped pick for one box and applies the sorter results", async () => {
    renderBatch();
    await heroSection();
    const boxSection = screen
      .getByRole("heading", { name: /Box A/ })
      .closest("section")!;
    fireEvent.click(
      within(boxSection).getByRole("button", {
        name: "orders.sorterPick.stopButton",
      }),
    );
    expect(
      await screen.findByText("orders.sorterPick.title"),
    ).toBeTruthy();
    expect(screen.getByText("Order 1")).toBeTruthy();
    expect(screen.getByText("Order 2")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "orders.sorterPick.startButton" }),
    );
    await waitFor(() => {
      expect(createSorterPickRunMock).toHaveBeenCalledWith(
        ["o1", "o2"],
        "loc-1",
        undefined,
      );
    });
    // the discard is available from creation, before anything is applied
    expect(
      await screen.findByRole("button", {
        name: "orders.sorterPick.discardRunPreset",
      }),
    ).toBeTruthy();
    fireEvent.click(
      await screen.findByRole("button", {
        name: "orders.sorterPick.applyButton",
      }),
    );
    await waitFor(() => {
      expect(applySorterPickRunMock).toHaveBeenCalledWith({
        orderGuids: ["o1", "o2"],
        locationGuid: "loc-1",
        presetGuids: ["preset-1"],
      });
    });
    expect(
      await screen.findByText("orders.sorterPick.appliedHint"),
    ).toBeTruthy();
    // cards still unpicked after applying weren't found in the box
    const groupedDialog = await screen.findByRole("dialog");
    expect(
      await within(groupedDialog).findByText("orders.sorterPick.missingCount"),
    ).toBeTruthy();
    fireEvent.click(
      within(groupedDialog).getAllByRole("button", {
        name: "orders.pickWalk.cantFindCard",
      })[0],
    );
    fireEvent.click(
      await screen.findByRole("button", {
        name: "orders.pickWalk.missingConfirm",
      }),
    );
    await waitFor(() => {
      expect(releaseSorterPickMissingMock).toHaveBeenCalledWith({
        orderGuid: "o1",
        scanId: "a",
      });
    });
    fireEvent.click(
      screen.getByRole("button", { name: "orders.sorterPick.done" }),
    );
    await waitFor(() => {
      expect(screen.queryByText("orders.sorterPick.title")).toBeNull();
    });
  });

  it("builds the batch sort preset from a dialog with a sorter choice", async () => {
    renderBatch();
    await heroSection();
    fireEvent.click(
      screen.getByRole("button", { name: "orders.batch.sortPresetButton" }),
    );
    const openedDialog = await screen.findByRole("dialog");
    expect(
      await within(openedDialog).findByText("orders.batch.sortPresetTitle"),
    ).toBeTruthy();
    // a previous preset for these picks is offered before creating a new one
    expect(
      await screen.findByText("orders.sorterPick.previousTitle"),
    ).toBeTruthy();
    const dialog = screen.getByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "orders.sorterPick.startButton",
      }),
    );
    await waitFor(() => {
      expect(createPickRunSortPresetMock).toHaveBeenCalledWith(
        ["o1", "o2"],
        undefined,
        undefined,
      );
    });
    // the dialog stays open showing the run, with the discard available
    expect(
      await screen.findByText("orders.sorterPick.runPresetDescription"),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "orders.sorterPick.discardRunPreset" }),
    );
    await waitFor(() => {
      expect(deleteSetMock).toHaveBeenCalledWith("preset-2");
    });
    // back to the prepare state, the previous preset is offered again
    expect(
      await screen.findByText("orders.sorterPick.preparePresetDescription"),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "orders.sorterPick.previousUse" }),
    );
    await waitFor(() => {
      expect(createPickRunSortPresetMock).toHaveBeenCalledWith(
        ["o1", "o2"],
        undefined,
        "preset-prev",
      );
    });
    expect(
      await screen.findByText("orders.sorterPick.runPresetDescription"),
    ).toBeTruthy();
  });
});
