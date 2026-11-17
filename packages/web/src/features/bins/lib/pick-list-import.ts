import type { PickListImport } from "@/lib/interfaces/bins";
import {
  formatDecklist,
  normalizePickListEntries,
  parseOrderImport,
} from "@magic-vault/shared";

export function pickListImportFromCardList(text: string): PickListImport {
  const { lines, skipped } = parseOrderImport(text);
  const entries = normalizePickListEntries(
    lines.map((line) => ({ name: line.name, quantity: line.quantity })),
  );
  return { decklist: formatDecklist(entries), entryCount: entries.length, skippedRows: skipped };
}
