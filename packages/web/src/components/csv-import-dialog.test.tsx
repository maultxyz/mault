import { CsvImportDialog } from "@/components/csv-import-dialog";
import type { ImportTemplateRow } from "@/lib/interfaces/csv-import";
import type { PickListEntryInput } from "@magic-vault/shared";
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

vi.mock("@/features/companies/api/use-organization", () => ({
  useOrg: () => ({}),
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

const PICK_CSV = [
  "Card Name,Qty,Set",
  "Lightning Bolt,2,M10",
  "Giant Growth,1,M10",
].join("\n");

const NO_NAME_CSV = [
  "Quantity,Set",
  "2,MIR",
  "1,MIR",
].join("\n");

function renderDialog(
  onImport: (entries: PickListEntryInput[]) => Promise<boolean>,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CsvImportDialog
        open
        onOpenChange={() => {}}
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
    mockTemplates.length = 0;
    try {
      localStorage.clear();
    } catch {
      return;
    }
  });

  it("auto-selects a saved template when the header row matches", async () => {
    mockTemplates.push({
      guid: "tpl-1",
      name: "Deck export",
      type: "picks",
      mapping: {
        type: "picks",
        columns: { name: 0, quantity: 1 },
        composition: "single",
        singleOrderName: null,
        sourceHeaders: ["Card Name", "Qty", "Set"],
      },
      createdAt: "2026-11-13T00:00:00.000Z",
      updatedAt: "2026-11-13T00:00:00.000Z",
    });
    renderDialog(vi.fn().mockResolvedValue(true));
    setText(PICK_CSV);

    await waitFor(() => {
      expect(screen.getAllByText("Deck export").length).toBeGreaterThan(0);
    });
  });

  it("imports the mapped CSV rows as pick list entries", async () => {
    const onImport = vi
      .fn<(entries: PickListEntryInput[]) => Promise<boolean>>()
      .mockResolvedValue(true);
    renderDialog(onImport);
    setText(PICK_CSV);

    const importButton = screen.getByRole("button", { name: "Import" });
    await waitFor(() => expect(importButton).not.toBeDisabled());
    fireEvent.click(importButton);

    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
    expect(onImport.mock.calls[0][0]).toEqual([
      { name: "Lightning Bolt", quantity: 2 },
      { name: "Giant Growth", quantity: 1 },
    ]);
  });

  it("disables import until the required card name column is mapped", async () => {
    renderDialog(vi.fn().mockResolvedValue(true));
    setText(NO_NAME_CSV);

    const importButton = screen.getByRole("button", { name: "Import" });
    await waitFor(() => expect(importButton).toBeDisabled());
  });

  it("falls back to decklist parsing for plain text", async () => {
    const onImport = vi
      .fn<(entries: PickListEntryInput[]) => Promise<boolean>>()
      .mockResolvedValue(true);
    renderDialog(onImport);
    setText("2 Lightning Bolt\n1 Giant Growth");

    const importButton = screen.getByRole("button", { name: "Import" });
    await waitFor(() => expect(importButton).not.toBeDisabled());
    fireEvent.click(importButton);

    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
    expect(onImport.mock.calls[0][0]).toEqual([
      { name: "Lightning Bolt", quantity: 2 },
      { name: "Giant Growth", quantity: 1 },
    ]);
  });
});
