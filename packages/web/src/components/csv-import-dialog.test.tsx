import { CsvImportDialog } from "@/components/csv-import-dialog";
import type {
  CsvImportPayload,
  ImportTemplateRow,
} from "@/lib/interfaces/csv-import";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockTemplates: ImportTemplateRow[] = [];

vi.mock("@/lib/api/import-templates", () => ({
  importTemplatesQueryOptions: () => ({
    queryKey: ["import-templates", "test"],
    queryFn: async () => mockTemplates,
  }),
  createImportTemplate: vi.fn(),
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: () => {}, error: () => {} },
}));

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});

const SHOPIFY_CSV = [
  "Name,Lineitem name,Lineitem quantity,Lineitem price",
  "1001,Lightning Bolt - Foil,2,$1.50",
  "1001,Giant Growth,1,$0.10",
  "1002,Counterspell,4,$0.75",
].join("\n");

const NO_NAME_CSV = [
  "Quantity,Set",
  "2,MIR",
  "1,MIR",
].join("\n");

function renderDialog(
  type: "orders" | "picks",
  onImport: (payload: CsvImportPayload) => Promise<boolean>,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CsvImportDialog
        open
        onOpenChange={() => {}}
        type={type}
        title="Import"
        description="Import description"
        importLabel="Import"
        onImport={onImport}
      />
    </QueryClientProvider>,
  );
}

function setText(text: string) {
  const textarea = screen.getByLabelText("contents.label");
  fireEvent.change(textarea, { target: { value: text } });
}

describe("CsvImportDialog", () => {
  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {}
    mockTemplates.length = 0;
  });

  it("auto-selects a saved template when the header row matches", async () => {
    mockTemplates.push({
      guid: "tpl-1",
      name: "Cardmarket",
      type: "orders",
      mapping: {
        type: "orders",
        columns: { name: 7, quantity: 4, language: 8, orderRef: 0 },
        composition: "reference",
        singleOrderName: null,
        sourceHeaders: [
          "idOrder",
          "customer",
          "status",
          "pos",
          "items",
          "category",
          "expansion",
          "name",
          "language",
        ],
      },
      createdAt: "2026-11-13T00:00:00.000Z",
      updatedAt: "2026-11-13T00:00:00.000Z",
    });
    renderDialog("orders", vi.fn().mockResolvedValue(true));
    setText(
      [
        "idOrder,customer,status,pos,items,category,expansion,name,language",
        '1,buyer,picking,1/1,1,,"Roaring Skies",\'Trainers\' Mail\',English',
      ].join("\n"),
    );

    await waitFor(() => {
      expect(screen.getAllByText("Cardmarket").length).toBeGreaterThan(0);
    });
  });

  it("prefills a Shopify mapping, previews derived orders and imports them", async () => {
    const onImport = vi
    .fn<(payload: CsvImportPayload) => Promise<boolean>>()
    .mockResolvedValue(true);
    renderDialog("orders", onImport);
    setText(SHOPIFY_CSV);

    await waitFor(() => {
      expect(screen.getByText("orders.title")).toBeTruthy();
    });
    const importButton = screen.getByRole("button", { name: "Import" });
    await waitFor(() => expect(importButton).not.toBeDisabled());
    fireEvent.click(importButton);

    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
    const payload = onImport.mock.calls[0][0];
    expect(payload.type).toBe("orders");
    if (payload.type !== "orders") return;
    expect(payload.source).toBe("shopify");
    expect(
      payload.orders.map((order) => order.reference),
    ).toEqual(["1001", "1002"]);
    expect(payload.orders[0].lines[0].isFoil).toBe(true);
  });

  it("disables import until the required card name column is mapped", async () => {
    renderDialog("orders", vi.fn().mockResolvedValue(true));
    setText(NO_NAME_CSV);

    const importButton = screen.getByRole("button", { name: "Import" });
    await waitFor(() => expect(importButton).toBeDisabled());
  });

  it("falls back to decklist parsing for plain text", async () => {
    const onImport = vi
    .fn<(payload: CsvImportPayload) => Promise<boolean>>()
    .mockResolvedValue(true);
    renderDialog("picks", onImport);
    setText("2 Lightning Bolt\n1 Giant Growth");

    const importButton = screen.getByRole("button", { name: "Import" });
    await waitFor(() => expect(importButton).not.toBeDisabled());
    fireEvent.click(importButton);

    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
    const payload = onImport.mock.calls[0][0];
    expect(payload.type).toBe("picks");
    if (payload.type !== "picks") return;
    expect(payload.entries).toEqual([
      { name: "Lightning Bolt", quantity: 2 },
      { name: "Giant Growth", quantity: 1 },
    ]);
  });
});
