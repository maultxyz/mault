import type { CardCondition } from "./card-condition.interface";
import type { CardLanguage } from "./card-language.interface";

export type CollectionCsvFormatKey =
  | "manabox"
  | "helvault"
  | "dragonShield"
  | "tcgplayerApp"
  | "tcgplayerSeller"
  | "mault"
  | "deckbox"
  | "archidekt"
  | "moxfield"
  | "generic";

export type CollectionCsvImportField =
  | "name"
  | "setCode"
  | "setName"
  | "collectorNumber"
  | "catalogId"
  | "quantity"
  | "foil"
  | "condition"
  | "language";

export interface CollectionCsvFormat {
  key: Exclude<CollectionCsvFormatKey, "generic">;
  label: string;
  detectHeaders: readonly string[];
  columns: Partial<Record<CollectionCsvImportField, readonly string[]>>;
}

export interface CollectionCsvImportRow {
  lineNumber: number;
  name: string;
  setCode: string | null;
  setName: string | null;
  collectorNumber: string | null;
  catalogId: string | null;
  quantity: number;
  isFoil: boolean | null;
  condition: CardCondition | null;
  language: CardLanguage | null;
}

export interface CollectionCsvParseResult {
  format: CollectionCsvFormatKey;
  rows: CollectionCsvImportRow[];
  skippedRows: number;
  hasNameColumn: boolean;
}

export interface CollectionCsvImportRequest {
  rows: CollectionCsvImportRow[];
}

export type CollectionCsvUnmatchedRow = Pick<
  CollectionCsvImportRow,
  "lineNumber" | "name" | "setCode" | "collectorNumber" | "quantity"
>;

export interface CollectionCsvImportResult {
  matchedCopies: number;
  importedCopies: number;
  unmatchedRowCount: number;
  unmatchedRows: CollectionCsvUnmatchedRow[];
}
