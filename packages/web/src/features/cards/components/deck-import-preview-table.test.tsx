import { DeckImportPreviewTable } from "@/features/cards/components/deck-import-preview-table";
import type { CollectionCsvImportRow } from "@magic-vault/shared";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

function deckRow(
  lineNumber: number,
  overrides: Partial<CollectionCsvImportRow>,
): CollectionCsvImportRow {
  return {
    lineNumber,
    name: "",
    setCode: null,
    setName: null,
    collectorNumber: null,
    catalogId: null,
    quantity: 1,
    isFoil: null,
    condition: null,
    language: null,
    cost: null,
    ...overrides,
  };
}

describe("DeckImportPreviewTable", () => {
  it("shows the matched printing's set and marks unmatched cards", () => {
    render(
      <DeckImportPreviewTable
        rows={[
          deckRow(1, { name: "Sol Ring", quantity: 2, setCode: "c21", isFoil: true }),
          deckRow(2, { name: "Made Up Card", setCode: "xyz", collectorNumber: "7" }),
        ]}
        matchedRows={[
          {
            lineNumber: 1,
            quantity: 2,
            name: "Sol Ring",
            setCode: "c21",
            setName: "Commander 2021",
            collectorNumber: "263",
          },
        ]}
      />,
    );
    const [, solRing, madeUp] = screen.getAllByRole("row");
    expect(within(solRing).getByText("Commander 2021")).toBeTruthy();
    expect(within(solRing).getByText("C21 #263")).toBeTruthy();
    expect(within(solRing).getByText("importCsv.deckLink.table.foil")).toBeTruthy();
    expect(within(solRing).getByText("importCsv.deckLink.table.matched")).toBeTruthy();
    expect(within(madeUp).getByText("XYZ #7")).toBeTruthy();
    expect(within(madeUp).getByText("importCsv.deckLink.table.notFound")).toBeTruthy();
  });
});
