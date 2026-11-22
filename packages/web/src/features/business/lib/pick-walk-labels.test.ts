import {
  pickWalkOrderLabel,
  pickWalkPlaceTitle,
  pickWalkPrintingLabel,
  pickWalkSpotLabel,
} from "@/features/business/lib/pick-walk-labels";
import type { PickWalkEntry } from "@magic-vault/shared";
import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";

const t = ((key: string, options?: Record<string, unknown>) => {
  const strings: Record<string, string> = {
    "orders.pickWalk.slot": `Slot ${options?.position}`,
    "orders.pickWalk.bin": `Bin ${options?.bin}`,
    "orders.pickWalk.collectionBin": `${options?.collection} · Bin ${options?.bin}`,
    "orders.orderRefLabel": `Order ${options?.order}`,
    "orders.orderBinLabel": `Bin ${options?.bin}`,
  };
  return strings[key] ?? key;
}) as unknown as TFunction;

function entry(
  overrides: Partial<PickWalkEntry> & { card: PickWalkEntry["card"] },
): PickWalkEntry {
  return {
    scanId: "s1",
    lineIndex: 0,
    isFoil: false,
    condition: "NM",
    collectionGuid: "c1",
    collectionName: "Inventory",
    binNumber: null,
    locationName: null,
    locationPosition: null,
    locationGuid: null,
    picked: false,
    orderRef: null,
    gameKey: "mtg",
    orderGuid: "o1",
    orderName: "Order 1",
    orderBin: null,
    ...overrides,
  };
}

describe("pick walk labels", () => {
  it("titles a stop by location, collection bin or plain collection", () => {
    expect(
      pickWalkPlaceTitle(
        { locationName: "Box 12", collectionName: "Inventory", binNumber: 3 },
        t,
      ),
    ).toBe("Box 12");
    expect(
      pickWalkPlaceTitle(
        { locationName: null, collectionName: "Inventory", binNumber: 3 },
        t,
      ),
    ).toBe("Inventory · Bin 3");
    expect(
      pickWalkPlaceTitle(
        { locationName: null, collectionName: "Inventory", binNumber: null },
        t,
      ),
    ).toBe("Inventory");
  });

  it("labels the spot as a slot number, bin or collection", () => {
    expect(
      pickWalkSpotLabel(
        entry({ card: { id: "x" } as PickWalkEntry["card"], locationName: "Box 12", locationPosition: 86 }),
        t,
      ),
    ).toBe("Slot 87");
    expect(
      pickWalkSpotLabel(
        entry({ card: { id: "x" } as PickWalkEntry["card"], binNumber: 2 }),
        t,
      ),
    ).toBe("Bin 2");
    expect(
      pickWalkSpotLabel(
        entry({ card: { id: "x" } as PickWalkEntry["card"] }),
        t,
      ),
    ).toBe("Inventory");
  });

  it("composes the printing line with foil last", () => {
    const card = {
      id: "x",
      name: "Lightning Bolt",
      set: "m10",
      setName: "Magic 2010",
      collectorNumber: "146",
      image: null,
    } as PickWalkEntry["card"];
    expect(pickWalkPrintingLabel(entry({ card }), t)).toBe(
      "Magic 2010 · #146 · NM",
    );
    expect(
      pickWalkPrintingLabel(
        entry({ card, isFoil: true, condition: "LP" }),
        t,
      ),
    ).toBe("Magic 2010 · #146 · LP · table.foil");
  });

  it("joins order name, reference and bin only when present", () => {
    const card = { id: "x" } as PickWalkEntry["card"];
    expect(pickWalkOrderLabel(entry({ card }), false, t)).toBeNull();
    expect(
      pickWalkOrderLabel(entry({ card, orderRef: "REF-9" }), false, t),
    ).toBe("Order REF-9");
    expect(
      pickWalkOrderLabel(
        entry({ card, orderRef: "REF-9", orderBin: 3 }),
        true,
        t,
      ),
    ).toBe("Order 1 · Order REF-9 · Bin 3");
  });
});
