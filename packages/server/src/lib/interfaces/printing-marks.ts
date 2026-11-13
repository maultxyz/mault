import type {
  PrintingMarkGroups,
  PrintingMarkMatch,
  PrintingMarkReference,
} from "@magic-vault/shared";

export interface PrintingMarkReferenceSet {
  version: string;
  byRegion: Map<string, Map<string, PrintingMarkReference | null>>;
}

export interface PrintingMarkReferenceEntry {
  gameKey: string;
  references: PrintingMarkReferenceSet | null;
  loading: Promise<PrintingMarkReferenceSet> | null;
  checkedAt: number;
}

export interface PrintingMarkCandidate {
  cardId: string;
  groups: PrintingMarkGroups | null;
}

export interface PrintingMarkRanking {
  winnerCardId: string | null;
  diagnostics: PrintingMarkMatch;
  evidenceByCardId: Map<string, number>;
}


export interface CatalogPrintingMarks {
  groups: PrintingMarkGroups | null;
  gridsByRegion: Map<string, Float32Array>;
}

export interface PrintingMarkBatchEntry {
  regionKey: string;
  groupKey: string;
  cardCount: number;
  sums: Float64Array;
  squares: Float64Array;
}

export type PrintingMarkBatch = Map<string, PrintingMarkBatchEntry>;

export interface PrintingMarkColumns {
  printingMarkGroups: PrintingMarkGroups | null;
  printingMarkVersion: number | null;
}
