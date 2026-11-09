import type { PrintingMarkGroups } from "@magic-vault/shared";
export interface CardMatchSourceRow {
  cardId: string;
  name: string;
  setCode: string;
  collectorNumber: string | null;
  rarePrinting: boolean;
  promoPrinting: boolean;
  printedSetTotal?: number | null;
  printingMarkGroups?: PrintingMarkGroups | null;
  embedding: Float32Array;
  backEmbedding: Float32Array | null;
}

export interface CardMatchSegment {
  gameKey: string;
  lang: string;
  cardIds: string[];
  names: string[];
  setCodes: string[];
  collectorNumbers: (string | null)[];
  rarePrinting: Uint8Array;
  promoPrinting: Uint8Array;
  printedSetTotals: Int32Array;
  printingMarkRegionKeys: string[];
  printingMarkGroupKeys: string[];
  printingMarkGroupIds: Int32Array;
  frontEmbeddings: Float32Array;
  backEmbeddings: Float32Array;
  backFaceIndexByRow: Int32Array;
}

export type GrowableTypedArray = Float32Array | Int32Array | Uint8Array;

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
  rowsByName: number[][];
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
