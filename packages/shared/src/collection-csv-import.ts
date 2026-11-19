import { cardLanguageFromText } from "./card-language";
import { conditionFromText, foilFromText, parseCsvRows } from "./order-import";
import {
  COLLECTION_CSV_ETCHED_PATTERN,
  COLLECTION_CSV_FORMATS,
  COLLECTION_CSV_GENERIC_COLUMNS,
  COLLECTION_CSV_IMPORT_MAX_ROWS,
  COLLECTION_CSV_IMPORT_QUANTITY_MAX,
  COLLECTION_CSV_IMPORT_TEXT_MAX_LENGTH,
  COLLECTION_CSV_SEPARATOR_LINE_PATTERN,
} from "./constants/collection-csv-import.constant";
import type { CardCondition } from "./interfaces/card-condition.interface";
import type {
  CollectionCsvFormatKey,
  CollectionCsvImportField,
  CollectionCsvImportRow,
  CollectionCsvParseResult,
} from "./interfaces/collection-csv-import.interface";

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

export function detectCollectionCsvFormat(headers: string[]): CollectionCsvFormatKey {
  const normalized = new Set(headers.map(normalizeHeader));
  return (
    COLLECTION_CSV_FORMATS.find((format) =>
      format.detectHeaders.every((header) => normalized.has(header)),
    )?.key ?? "generic"
  );
}

function columnIndexes(
  headers: string[],
  format: CollectionCsvFormatKey,
): Partial<Record<CollectionCsvImportField, number>> {
  const normalized = headers.map(normalizeHeader);
  const columns: Partial<Record<CollectionCsvImportField, readonly string[]>> =
    COLLECTION_CSV_FORMATS.find((entry) => entry.key === format)?.columns ??
    COLLECTION_CSV_GENERIC_COLUMNS;
  const indexes: Partial<Record<CollectionCsvImportField, number>> = {};
  for (const [field, aliases] of Object.entries(columns) as [CollectionCsvImportField, readonly string[]][]) {
    const index = aliases
      .map((alias) => normalized.indexOf(alias))
      .find((candidate) => candidate !== -1);
    if (index !== undefined) indexes[field] = index;
  }
  return indexes;
}

function cleanCell(value: string | undefined): string | null {
  const text = value?.trim().slice(0, COLLECTION_CSV_IMPORT_TEXT_MAX_LENGTH);
  return text ? text : null;
}

export function importedQuantityFromText(value: string | null): number | null {
  if (value === null) return 1;
  const parsed = Number.parseInt(value.replace(/[^0-9]/g, ""), 10);
  if (!Number.isFinite(parsed)) return 1;
  if (parsed < 1) return null;
  return Math.min(parsed, COLLECTION_CSV_IMPORT_QUANTITY_MAX);
}

export function importedFoilFromText(value: string | null): boolean | null {
  if (value === null) return null;
  if (COLLECTION_CSV_ETCHED_PATTERN.test(value)) return true;
  return foilFromText(value);
}

export function importedConditionFromText(value: string | null): CardCondition | null {
  if (value === null) return null;
  const spaced = value.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  return conditionFromText(spaced);
}

export function parseCollectionCsv(text: string): CollectionCsvParseResult {
  const source = text.replace(/^﻿/, "").replace(COLLECTION_CSV_SEPARATOR_LINE_PATTERN, "");
  const [headerRow, ...dataRows] = parseCsvRows(source);
  const headers = (headerRow ?? []).map((header) => header.trim());
  const format = detectCollectionCsvFormat(headers);
  const indexes = columnIndexes(headers, format);
  const cell = (row: string[], field: CollectionCsvImportField) => {
    const index = indexes[field];
    return index === undefined ? null : cleanCell(row[index]);
  };

  const rows: CollectionCsvImportRow[] = [];
  let skippedRows = 0;
  dataRows.forEach((row, index) => {
    if (row.every((value) => value.trim() === "")) return;
    const name = cell(row, "name");
    const quantity = importedQuantityFromText(cell(row, "quantity"));
    if (!name || quantity === null || rows.length >= COLLECTION_CSV_IMPORT_MAX_ROWS) {
      skippedRows++;
      return;
    }
    const conditionText = cell(row, "condition");
    rows.push({
      lineNumber: index + 2,
      name,
      setCode: cell(row, "setCode"),
      setName: cell(row, "setName"),
      collectorNumber: cell(row, "collectorNumber"),
      catalogId: cell(row, "catalogId"),
      quantity,
      isFoil:
        importedFoilFromText(cell(row, "foil")) ??
        (conditionText && /foil/i.test(conditionText) ? true : null),
      condition: importedConditionFromText(conditionText),
      language: cardLanguageFromText(cell(row, "language")),
    });
  });

  return {
    format,
    rows,
    skippedRows,
    hasNameColumn: indexes.name !== undefined,
  };
}

export function collectionCsvFormatLabel(format: CollectionCsvFormatKey): string | null {
  return COLLECTION_CSV_FORMATS.find((entry) => entry.key === format)?.label ?? null;
}
