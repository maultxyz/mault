import { buildPickImportRequests } from "@/features/business/lib/pick-import";
import type { ComposedCsvOrder } from "@magic-vault/shared";
import { describe, expect, it } from "vitest";

function order(reference: string | null, name: string): ComposedCsvOrder {
  return {
    reference,
    customerName: null,
    customerContact: null,
    shippingAddress: null,
    orderNote: null,
    carrier: null,
    trackingNumber: null,
    lines: [{ name, quantity: 1 }],
  };
}

const base = {
  createMode: "together" as const,
  pickName: "",
  source: "generic" as const,
  fallbackName: (index: number) => `Imported ${index + 1}`,
  batchName: (count: number) => `${count} orders`,
};

describe("buildPickImportRequests", () => {
  it("keeps a single-order file untagged and named after the order", () => {
    expect(
      buildPickImportRequests({
        ...base,
        composition: "single",
        orders: [order("Weekend", "Sol Ring")],
      }),
    ).toEqual([
      { name: "Weekend", source: "generic", lines: [{ name: "Sol Ring", quantity: 1 }] },
    ]);
  });

  it("uses the typed pick name over the generated one", () => {
    const [request] = buildPickImportRequests({
      ...base,
      composition: "reference",
      pickName: "  Friday  ",
      orders: [order("1", "Sol Ring"), order("2", "Island")],
    });
    expect(request.name).toBe("Friday");
    expect(request.lines.map((line) => line.orderRef)).toEqual(["1", "2"]);
  });
});
