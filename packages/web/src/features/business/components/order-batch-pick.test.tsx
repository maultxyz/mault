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
    fireEvent.click(screen.getByRole("tab", { name: "orders.batch.sortTab" }));
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
    fireEvent.click(screen.getByRole("tab", { name: "orders.batch.walkTab" }));
    expect(screen.getByRole("tab", { name: "orders.batch.walkTab" }).getAttribute("aria-selected")).toBe("true");
  });

  it("offers a list only view without the next up hero", async () => {
    renderBatch();
    await heroSection();
    fireEvent.click(screen.getByRole("tab", { name: "orders.batch.listTab" }));
    await waitFor(() => {
      expect(screen.queryByText("orders.pickWalk.nextUp")).toBeNull();
    });
    expect(screen.getByRole("button", { name: "orders.pickCopyForOrder" })).toBeTruthy();
  });

  it("picks and skips in the fullscreen focus view and returns to picking", async () => {
    renderBatch();
    await heroSection();
    fireEvent.click(screen.getByRole("tab", { name: "orders.batch.focusTab" }));
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
    fireEvent.click(
      screen.getByRole("button", { name: "orders.batch.focusBack" }),
    );
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "orders.batch.focusTab" })).toBeTruthy();
    });
  });

  it("picks by swiping right in the focus view", async () => {
    renderBatch();
    await heroSection();
    fireEvent.click(screen.getByRole("tab", { name: "orders.batch.focusTab" }));
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
    fireEvent.click(screen.getByRole("tab", { name: "orders.batch.boxTab" }));
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
});
