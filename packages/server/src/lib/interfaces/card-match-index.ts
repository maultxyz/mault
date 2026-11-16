import type { PrintingMarkGroups } from "@magic-vault/shared";
export interface CardMatchSourceRow {
  cardId: string;
  name: string;
  setCode: string;
  collectorNumber: string | null;
  rarePrinting: boolean;
  promoPrinting: boolean;
  printedLanguageCode?: boolean | null;
  printedSetTotal?: number | null;
  printingMarkGroups?: PrintingMarkGroups | null;
  embedding: Float32Array;
  backEmbedding: Float32Array | null;
}

export interface CardMatchIndexPageRow extends Record<string, unknown> {
  card_id: string;
  name: string;
  set_code: string;
  collector_number: string | null;
  rare_printing: boolean;
  promo_printing: boolean;
  printed_language_code: boolean | null;
  printed_set_total: number | null;
  printing_mark_groups: PrintingMarkGroups | null;
  embedding: Buffer;
  back_embedding: Buffer | null;
}

export type CardMatchEmbeddingTransferFormat = "vector" | "halfvec";

export type CardMatchEmbeddingDecoder = (
  sentBytes: Uint8Array | null,
) => Float32Array | null;

export interface CardMatchSegment {
  gameKey: string;
  lang: string;
  rowCount: number;
  cardIdReferenceByRow: Int32Array;
  cardIdUuidBytes: Uint8Array;
  cardIdTextBlob: string;
  cardIdTextOffsets: Int32Array;
  nameTable: string[];
  nameIndexByRow: Int32Array;
  setCodeTable: string[];
  setCodeIndexByRow: Int32Array;
  collectorNumberTable: string[];
  collectorNumberIndexByRow: Int32Array;
  textBytes: number;
  rarePrinting: Uint8Array;
  promoPrinting: Uint8Array;
  printedLanguageCode: Int8Array;
  printedSetTotals: Int32Array;
  printingMarkRegionKeys: string[];
  printingMarkGroupKeys: string[];
  printingMarkGroupIds: Int32Array;
  frontEmbeddings: Int8Array;
  frontEmbeddingScales: Float32Array;
  backEmbeddings: Int8Array;
  backEmbeddingScales: Float32Array;
  backFaceIndexByRow: Int32Array;
}

export type GrowableTypedArray =
  | Float32Array
  | Int32Array
  | Int8Array
  | Uint8Array;

export interface CardMatchSegmentCapacity {
  expectedRows: number;
  expectedBackFaces: number;
}

export interface CardMatchSegmentBuilder {
  add(row: CardMatchSourceRow): void;
  finish(): CardMatchSegment;
}

export interface CardFaceMatch {
  segment: CardMatchSegment;
  row: number;
  isBackFace: boolean;
  distance: number;
}

export interface CardMatchSegmentEntry {
  gameKey: string;
  lang: string;
  segment: CardMatchSegment | null;
  signature: string | null;
  loading: Promise<void> | null;
  queuedForBackgroundLoad: boolean;
  reloadRequested: boolean;
  checkedAt: number;
  lastUsedAt: number;
}

export interface CardMatchSegmentSignature {
  value: string;
  rowCount: number;
  backFaceCount: number;
}

export interface LoadedCardMatchSegment {
  segment: CardMatchSegment;
  signature: string;
}

export interface CardNameTrigramIndex {
  names: string[];
  rowOffsetsByName: Int32Array;
  rowsInNameOrder: Int32Array;
  offsets: Int32Array;
  trigramIds: Int32Array;
}

export interface CardNameMatch {
  segment: CardMatchSegment;
  row: number;
  score: number;
}

export interface OcrCandidateRow {
  segment: CardMatchSegment;
  row: number;
  distance: number;
}
