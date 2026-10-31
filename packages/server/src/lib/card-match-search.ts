import {
  CARD_MATCH_INDEX_ESTIMATED_ROW_TEXT_BYTES,
  MILO_EMBEDDING_DIM,
} from "./constants/card-search";
import type {
  CardFaceMatch,
  CardMatchSegment,
  CardMatchSegmentBuilder,
  CardMatchSegmentCapacity,
  CardMatchSourceRow,
  GrowableTypedArray,
} from "./interfaces/card-match-index";

export function normalizedEmbedding(
  embedding: ArrayLike<number>,
): Float32Array {
  if (embedding.length !== MILO_EMBEDDING_DIM) {
    throw new Error(
      `Expected a ${MILO_EMBEDDING_DIM}-dimension embedding, got ${embedding.length}.`,
    );
  }
  const normalized = Float32Array.from(embedding);
  let squaredLength = 0;
  for (let i = 0; i < normalized.length; i++) {
    squaredLength += normalized[i] * normalized[i];
  }
  const length = Math.sqrt(squaredLength);
  if (length > 0) {
    for (let i = 0; i < normalized.length; i++) normalized[i] /= length;
  }
  return normalized;
}

function withCapacity<T extends GrowableTypedArray>(
  buffer: T,
  length: number,
): T {
  if (buffer.length >= length) return buffer;
  const grown = new (buffer.constructor as new (length: number) => T)(
    Math.max(length, buffer.length * 2),
  );
  grown.set(buffer);
  return grown;
}

export function createCardMatchSegmentBuilder(
  gameKey: string,
  lang: string,
  { expectedRows, expectedBackFaces }: CardMatchSegmentCapacity,
): CardMatchSegmentBuilder {
  const cardIds: string[] = [];
  const names: string[] = [];
  const setCodes: string[] = [];
  let rarePrinting = new Uint8Array(expectedRows);
  let frontEmbeddings = new Float32Array(expectedRows * MILO_EMBEDDING_DIM);
  let backEmbeddings = new Float32Array(
    expectedBackFaces * MILO_EMBEDDING_DIM,
  );
  let backFaceIndexByRow = new Int32Array(expectedRows);
  let backFaceCount = 0;

  return {
    add(row) {
      const rowIndex = cardIds.length;
      cardIds.push(row.cardId);
      names.push(row.name);
      setCodes.push(row.setCode);
      rarePrinting = withCapacity(rarePrinting, rowIndex + 1);
      rarePrinting[rowIndex] = row.rarePrinting ? 1 : 0;
      frontEmbeddings = withCapacity(
        frontEmbeddings,
        (rowIndex + 1) * MILO_EMBEDDING_DIM,
      );
      frontEmbeddings.set(
        normalizedEmbedding(row.embedding),
        rowIndex * MILO_EMBEDDING_DIM,
      );
      backFaceIndexByRow = withCapacity(backFaceIndexByRow, rowIndex + 1);
      backFaceIndexByRow[rowIndex] = -1;
      if (row.backEmbedding) {
        backEmbeddings = withCapacity(
          backEmbeddings,
          (backFaceCount + 1) * MILO_EMBEDDING_DIM,
        );
        backEmbeddings.set(
          normalizedEmbedding(row.backEmbedding),
          backFaceCount * MILO_EMBEDDING_DIM,
        );
        backFaceIndexByRow[rowIndex] = backFaceCount++;
      }
    },
    finish() {
      const rowCount = cardIds.length;
      return {
        gameKey,
        lang,
        cardIds,
        names,
        setCodes,
        rarePrinting: rarePrinting.subarray(0, rowCount),
        frontEmbeddings: frontEmbeddings.subarray(
          0,
          rowCount * MILO_EMBEDDING_DIM,
        ),
        backEmbeddings: backEmbeddings.subarray(
          0,
          backFaceCount * MILO_EMBEDDING_DIM,
        ),
        backFaceIndexByRow: backFaceIndexByRow.subarray(0, rowCount),
      };
    },
  };
}

export function buildCardMatchSegment(
  gameKey: string,
  lang: string,
  rows: CardMatchSourceRow[],
): CardMatchSegment {
  const builder = createCardMatchSegmentBuilder(gameKey, lang, {
    expectedRows: rows.length,
    expectedBackFaces: 0,
  });
  for (const row of rows) builder.add(row);
  return builder.finish();
}

export function cardMatchSegmentBytes(segment: CardMatchSegment): number {
  return (
    segment.frontEmbeddings.byteLength +
    segment.backEmbeddings.byteLength +
    segment.backFaceIndexByRow.byteLength +
    segment.rarePrinting.byteLength +
    segment.cardIds.length * CARD_MATCH_INDEX_ESTIMATED_ROW_TEXT_BYTES
  );
}

function cosineDistance(
  embeddings: Float32Array,
  offset: number,
  query: Float32Array,
): number {
  let sum0 = 0;
  let sum1 = 0;
  let sum2 = 0;
  let sum3 = 0;
  for (let i = 0; i < MILO_EMBEDDING_DIM; i += 4) {
    sum0 += embeddings[offset + i] * query[i];
    sum1 += embeddings[offset + i + 1] * query[i + 1];
    sum2 += embeddings[offset + i + 2] * query[i + 2];
    sum3 += embeddings[offset + i + 3] * query[i + 3];
  }
  return 1 - (sum0 + sum1 + sum2 + sum3);
}

function backFaceDistance(
  segment: CardMatchSegment,
  row: number,
  query: Float32Array,
): number {
  const backFaceIndex = segment.backFaceIndexByRow[row];
  return backFaceIndex < 0
    ? Infinity
    : cosineDistance(
        segment.backEmbeddings,
        backFaceIndex * MILO_EMBEDDING_DIM,
        query,
      );
}

function closestFaceOfRow(
  segment: CardMatchSegment,
  row: number,
  query: Float32Array,
): CardFaceMatch {
  const frontDistance = cosineDistance(
    segment.frontEmbeddings,
    row * MILO_EMBEDDING_DIM,
    query,
  );
  const backDistance = backFaceDistance(segment, row, query);
  return backDistance < frontDistance
    ? { segment, row, isBackFace: true, distance: backDistance }
    : { segment, row, isBackFace: false, distance: frontDistance };
}

export function nearestCardFaces(
  segments: CardMatchSegment[],
  query: Float32Array,
  limit: number,
): CardFaceMatch[] {
  const nearest: CardFaceMatch[] = [];
  for (const segment of segments) {
    for (let row = 0; row < segment.cardIds.length; row++) {
      const distance = Math.min(
        cosineDistance(segment.frontEmbeddings, row * MILO_EMBEDDING_DIM, query),
        backFaceDistance(segment, row, query),
      );
      if (nearest.length === limit && distance >= nearest[limit - 1].distance) {
        continue;
      }
      let position = Math.min(nearest.length, limit - 1);
      while (position > 0 && distance < nearest[position - 1].distance) {
        position--;
      }
      nearest.splice(position, 0, closestFaceOfRow(segment, row, query));
      if (nearest.length > limit) nearest.pop();
    }
  }
  return nearest;
}

function faceEmbedding(face: CardFaceMatch): Float32Array {
  const index = face.isBackFace
    ? face.segment.backFaceIndexByRow[face.row]
    : face.row;
  const embeddings = face.isBackFace
    ? face.segment.backEmbeddings
    : face.segment.frontEmbeddings;
  return embeddings.subarray(
    index * MILO_EMBEDDING_DIM,
    (index + 1) * MILO_EMBEDDING_DIM,
  );
}

export function faceDistance(face: CardFaceMatch, other: CardFaceMatch): number {
  return cosineDistance(faceEmbedding(face), 0, faceEmbedding(other));
}

export function closestPrintingInSet(
  segment: CardMatchSegment,
  name: string,
  setCode: string,
  query: Float32Array,
): CardFaceMatch | null {
  const wantedSetCode = setCode.toLowerCase();
  let closest: CardFaceMatch | null = null;
  for (let row = 0; row < segment.cardIds.length; row++) {
    if (
      segment.names[row] !== name ||
      segment.setCodes[row].toLowerCase() !== wantedSetCode
    ) {
      continue;
    }
    const face = closestFaceOfRow(segment, row, query);
    if (!closest || face.distance < closest.distance) closest = face;
  }
  return closest;
}
