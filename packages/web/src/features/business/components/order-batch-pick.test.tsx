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
