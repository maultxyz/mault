export interface CardMatchSourceRow {
  cardId: string;
  name: string;
  setCode: string;
  rarePrinting: boolean;
  embedding: Float32Array;
  backEmbedding: Float32Array | null;
}

export interface CardMatchSegment {
  gameKey: string;
  lang: string;
  cardIds: string[];
  names: string[];
  setCodes: string[];
  rarePrinting: Uint8Array;
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
