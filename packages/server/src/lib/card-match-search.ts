import {
  printingRegionsOf,
  type PrintingMarkGroups,
} from "@magic-vault/shared";
import {
  PRINTING_MARK_GROUP_ABSENT,
  PRINTING_MARK_GROUP_UNKNOWN,
} from "./constants/printing-marks";
import {
  CARD_MATCH_INDEX_CANONICAL_UUID_PATTERN,
  CARD_MATCH_INDEX_ESTIMATED_STRING_OVERHEAD_BYTES,
  CARD_MATCH_INDEX_INT8_EMBEDDING_MAX,
  CARD_MATCH_INDEX_UUID_BYTES,
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

function writeQuantizedEmbedding(
  embedding: ArrayLike<number>,
  target: Int8Array,
  offset: number,
): number {
  if (embedding.length !== MILO_EMBEDDING_DIM) {
    throw new Error(
      `Expected a ${MILO_EMBEDDING_DIM}-dimension embedding, got ${embedding.length}.`,
    );
  }
  let largestMagnitude = 0;
  for (let i = 0; i < MILO_EMBEDDING_DIM; i++) {
    largestMagnitude = Math.max(largestMagnitude, Math.abs(embedding[i]));
  }
  if (largestMagnitude === 0) return 0;
  const toInt8 = CARD_MATCH_INDEX_INT8_EMBEDDING_MAX / largestMagnitude;
  let squaredLength = 0;
  for (let i = 0; i < MILO_EMBEDDING_DIM; i++) {
    const quantized = Math.round(embedding[i] * toInt8);
    target[offset + i] = quantized;
    squaredLength += quantized * quantized;
  }
  return 1 / Math.sqrt(squaredLength);
}

function withCapacity<T extends GrowableTypedArray>(
  buffer: T,
  length: number,
): T {
  if (buffer.length >= length) return buffer;
  const grown = new (buffer.constructor as new (length: number) => T)(
    Math.max(length, buffer.length * 2),
  );
  grown.set(buffer as never);
  return grown;
}

function createStringTable() {
  const table: string[] = [];
  const indexByValue = new Map<string, number>();
  return {
    table,
    indexOf(value: string): number {
      let index = indexByValue.get(value);
      if (index === undefined) {
        index = table.length;
        indexByValue.set(value, index);
        table.push(value);
      }
      return index;
    },
  };
}

function estimatedStringBytes(values: string[]): number {
  let bytes = 0;
  for (const value of values) {
    bytes += value.length + CARD_MATCH_INDEX_ESTIMATED_STRING_OVERHEAD_BYTES;
  }
  return bytes;
}

function writeUuidBytes(uuid: string, target: Uint8Array, offset: number) {
  const hex = uuid.replaceAll("-", "");
  for (let i = 0; i < CARD_MATCH_INDEX_UUID_BYTES; i++) {
    target[offset + i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
}

function uuidFromBytes(source: Uint8Array, offset: number): string {
  let hex = "";
  for (let i = 0; i < CARD_MATCH_INDEX_UUID_BYTES; i++) {
    hex += source[offset + i].toString(16).padStart(2, "0");
  }
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createCardMatchSegmentBuilder(
  gameKey: string,
  lang: string,
  { expectedRows, expectedBackFaces }: CardMatchSegmentCapacity,
): CardMatchSegmentBuilder {
  let rowCount = 0;
  let cardIdReferenceByRow = new Int32Array(expectedRows);
  let cardIdUuidBytes = new Uint8Array(
    expectedRows * CARD_MATCH_INDEX_UUID_BYTES,
  );
  let uuidCardIdCount = 0;
  const textCardIds: string[] = [];
  const names = createStringTable();
  let nameIndexByRow = new Int32Array(expectedRows);
  const setCodes = createStringTable();
  let setCodeIndexByRow = new Int32Array(expectedRows);
  const collectorNumbers = createStringTable();
  let collectorNumberIndexByRow = new Int32Array(expectedRows);
  let rarePrinting = new Uint8Array(expectedRows);
  let promoPrinting = new Uint8Array(expectedRows);
  let printedSetTotals = new Int32Array(expectedRows);
  const printingMarkRegionKeys = printingRegionsOf(gameKey).map(
    (region) => region.key,
  );
  const regionCount = printingMarkRegionKeys.length;
  const printingMarkGroupKeys: string[] = [];
  const groupIdByKey = new Map<string, number>();
  let printingMarkGroupIds = new Int32Array(expectedRows * regionCount);
  let frontEmbeddings = new Int8Array(expectedRows * MILO_EMBEDDING_DIM);
  let frontEmbeddingScales = new Float32Array(expectedRows);
  let backEmbeddings = new Int8Array(expectedBackFaces * MILO_EMBEDDING_DIM);
  let backEmbeddingScales = new Float32Array(expectedBackFaces);
  let backFaceIndexByRow = new Int32Array(expectedRows);
  let backFaceCount = 0;

  return {
    add(row) {
      const rowIndex = rowCount++;
      cardIdReferenceByRow = withCapacity(cardIdReferenceByRow, rowCount);
      if (CARD_MATCH_INDEX_CANONICAL_UUID_PATTERN.test(row.cardId)) {
        cardIdUuidBytes = withCapacity(
          cardIdUuidBytes,
          (uuidCardIdCount + 1) * CARD_MATCH_INDEX_UUID_BYTES,
        );
        writeUuidBytes(
          row.cardId,
          cardIdUuidBytes,
          uuidCardIdCount * CARD_MATCH_INDEX_UUID_BYTES,
        );
        cardIdReferenceByRow[rowIndex] = uuidCardIdCount++;
      } else {
        textCardIds.push(row.cardId);
        cardIdReferenceByRow[rowIndex] = -textCardIds.length;
      }
      nameIndexByRow = withCapacity(nameIndexByRow, rowCount);
      nameIndexByRow[rowIndex] = names.indexOf(row.name);
      setCodeIndexByRow = withCapacity(setCodeIndexByRow, rowCount);
      setCodeIndexByRow[rowIndex] = setCodes.indexOf(row.setCode);
      collectorNumberIndexByRow = withCapacity(
        collectorNumberIndexByRow,
        rowCount,
      );
      collectorNumberIndexByRow[rowIndex] =
        row.collectorNumber === null
          ? -1
          : collectorNumbers.indexOf(row.collectorNumber);
      rarePrinting = withCapacity(rarePrinting, rowCount);
      rarePrinting[rowIndex] = row.rarePrinting ? 1 : 0;
      promoPrinting = withCapacity(promoPrinting, rowCount);
      promoPrinting[rowIndex] = row.promoPrinting ? 1 : 0;
      printedSetTotals = withCapacity(printedSetTotals, rowCount);
      printedSetTotals[rowIndex] = row.printedSetTotal ?? 0;
      printingMarkGroupIds = withCapacity(
        printingMarkGroupIds,
        rowCount * regionCount,
      );
      printingMarkRegionKeys.forEach((regionKey, regionIndex) => {
        let groupId = PRINTING_MARK_GROUP_UNKNOWN;
        if (row.printingMarkGroups) {
          const groupKey =
            row.printingMarkGroups[regionKey as keyof PrintingMarkGroups];
          if (!groupKey) groupId = PRINTING_MARK_GROUP_ABSENT;
          else {
            groupId =
              groupIdByKey.get(groupKey) ?? printingMarkGroupKeys.length;
            if (groupId === printingMarkGroupKeys.length) {
              groupIdByKey.set(groupKey, groupId);
              printingMarkGroupKeys.push(groupKey);
            }
          }
        }
        printingMarkGroupIds[rowIndex * regionCount + regionIndex] = groupId;
      });
      frontEmbeddings = withCapacity(
        frontEmbeddings,
        rowCount * MILO_EMBEDDING_DIM,
      );
      frontEmbeddingScales = withCapacity(frontEmbeddingScales, rowCount);
      frontEmbeddingScales[rowIndex] = writeQuantizedEmbedding(
        row.embedding,
        frontEmbeddings,
        rowIndex * MILO_EMBEDDING_DIM,
      );
      backFaceIndexByRow = withCapacity(backFaceIndexByRow, rowCount);
      backFaceIndexByRow[rowIndex] = -1;
      if (row.backEmbedding) {
        backEmbeddings = withCapacity(
          backEmbeddings,
          (backFaceCount + 1) * MILO_EMBEDDING_DIM,
        );
        backEmbeddingScales = withCapacity(
          backEmbeddingScales,
          backFaceCount + 1,
        );
        backEmbeddingScales[backFaceCount] = writeQuantizedEmbedding(
          row.backEmbedding,
          backEmbeddings,
          backFaceCount * MILO_EMBEDDING_DIM,
        );
        backFaceIndexByRow[rowIndex] = backFaceCount++;
      }
    },
    finish() {
      const cardIdTextOffsets = new Int32Array(textCardIds.length + 1);
      textCardIds.forEach((cardId, index) => {
        cardIdTextOffsets[index + 1] = cardIdTextOffsets[index] + cardId.length;
      });
      const cardIdTextBlob = textCardIds.join("");
      return {
        gameKey,
        lang,
        rowCount,
        cardIdReferenceByRow: cardIdReferenceByRow.slice(0, rowCount),
        cardIdUuidBytes: cardIdUuidBytes.slice(
          0,
          uuidCardIdCount * CARD_MATCH_INDEX_UUID_BYTES,
        ),
        cardIdTextBlob,
        cardIdTextOffsets,
        nameTable: names.table,
        nameIndexByRow: nameIndexByRow.slice(0, rowCount),
        setCodeTable: setCodes.table,
        setCodeIndexByRow: setCodeIndexByRow.slice(0, rowCount),
        collectorNumberTable: collectorNumbers.table,
        collectorNumberIndexByRow: collectorNumberIndexByRow.slice(
          0,
          rowCount,
        ),
        textBytes:
          cardIdTextBlob.length +
          estimatedStringBytes(names.table) +
          estimatedStringBytes(setCodes.table) +
          estimatedStringBytes(collectorNumbers.table) +
          estimatedStringBytes(printingMarkGroupKeys),
        rarePrinting: rarePrinting.slice(0, rowCount),
        promoPrinting: promoPrinting.slice(0, rowCount),
        printedSetTotals: printedSetTotals.slice(0, rowCount),
        printingMarkRegionKeys,
        printingMarkGroupKeys,
        printingMarkGroupIds: printingMarkGroupIds.slice(
          0,
          rowCount * regionCount,
        ),
        frontEmbeddings: frontEmbeddings.slice(
          0,
          rowCount * MILO_EMBEDDING_DIM,
        ),
        frontEmbeddingScales: frontEmbeddingScales.slice(0, rowCount),
        backEmbeddings: backEmbeddings.slice(
          0,
          backFaceCount * MILO_EMBEDDING_DIM,
        ),
        backEmbeddingScales: backEmbeddingScales.slice(0, backFaceCount),
        backFaceIndexByRow: backFaceIndexByRow.slice(0, rowCount),
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
    segment.cardIdReferenceByRow.byteLength +
    segment.cardIdUuidBytes.byteLength +
    segment.cardIdTextOffsets.byteLength +
    segment.nameIndexByRow.byteLength +
    segment.setCodeIndexByRow.byteLength +
    segment.collectorNumberIndexByRow.byteLength +
    segment.textBytes +
    segment.frontEmbeddings.byteLength +
    segment.frontEmbeddingScales.byteLength +
    segment.backEmbeddings.byteLength +
    segment.backEmbeddingScales.byteLength +
    segment.backFaceIndexByRow.byteLength +
    segment.rarePrinting.byteLength +
    segment.promoPrinting.byteLength +
    segment.printedSetTotals.byteLength +
    segment.printingMarkGroupIds.byteLength
  );
}

export function cardIdOfRow(segment: CardMatchSegment, row: number): string {
  const reference = segment.cardIdReferenceByRow[row];
  if (reference >= 0) {
    return uuidFromBytes(
      segment.cardIdUuidBytes,
      reference * CARD_MATCH_INDEX_UUID_BYTES,
    );
  }
  const textIndex = -reference - 1;
  return segment.cardIdTextBlob.slice(
    segment.cardIdTextOffsets[textIndex],
    segment.cardIdTextOffsets[textIndex + 1],
  );
}

export function nameOfRow(segment: CardMatchSegment, row: number): string {
  return segment.nameTable[segment.nameIndexByRow[row]];
}

export function setCodeOfRow(segment: CardMatchSegment, row: number): string {
  return segment.setCodeTable[segment.setCodeIndexByRow[row]];
}

export function collectorNumberOfRow(
  segment: CardMatchSegment,
  row: number,
): string | null {
  const index = segment.collectorNumberIndexByRow[row];
  return index < 0 ? null : segment.collectorNumberTable[index];
}

function quantizedCosineDistance(
  embeddings: Int8Array,
  offset: number,
  scale: number,
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
  return 1 - (sum0 + sum1 + sum2 + sum3) * scale;
}

function frontFaceDistance(
  segment: CardMatchSegment,
  row: number,
  query: Float32Array,
): number {
  return quantizedCosineDistance(
    segment.frontEmbeddings,
    row * MILO_EMBEDDING_DIM,
    segment.frontEmbeddingScales[row],
    query,
  );
}

function backFaceDistance(
  segment: CardMatchSegment,
  row: number,
  query: Float32Array,
): number {
  const backFaceIndex = segment.backFaceIndexByRow[row];
  return backFaceIndex < 0
    ? Infinity
    : quantizedCosineDistance(
        segment.backEmbeddings,
        backFaceIndex * MILO_EMBEDDING_DIM,
        segment.backEmbeddingScales[backFaceIndex],
        query,
      );
}

function closestFaceOfRow(
  segment: CardMatchSegment,
  row: number,
  query: Float32Array,
): CardFaceMatch {
  const frontDistance = frontFaceDistance(segment, row, query);
  const backDistance = backFaceDistance(segment, row, query);
  return backDistance < frontDistance
    ? { segment, row, isBackFace: true, distance: backDistance }
    : { segment, row, isBackFace: false, distance: frontDistance };
}

export function cardRowDistance(
  segment: CardMatchSegment,
  row: number,
  query: Float32Array,
): number {
  return Math.min(
    frontFaceDistance(segment, row, query),
    backFaceDistance(segment, row, query),
  );
}

export function nearestCardFaces(
  segments: CardMatchSegment[],
  query: Float32Array,
  limit: number,
): CardFaceMatch[] {
  const nearest: CardFaceMatch[] = [];
  for (const segment of segments) {
    for (let row = 0; row < segment.rowCount; row++) {
      const distance = cardRowDistance(segment, row, query);
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

function dequantizedFaceEmbedding(face: CardFaceMatch): Float32Array {
  const index = face.isBackFace
    ? face.segment.backFaceIndexByRow[face.row]
    : face.row;
  const embeddings = face.isBackFace
    ? face.segment.backEmbeddings
    : face.segment.frontEmbeddings;
  const scale = face.isBackFace
    ? face.segment.backEmbeddingScales[index]
    : face.segment.frontEmbeddingScales[index];
  const dequantized = new Float32Array(MILO_EMBEDDING_DIM);
  const offset = index * MILO_EMBEDDING_DIM;
  for (let i = 0; i < MILO_EMBEDDING_DIM; i++) {
    dequantized[i] = embeddings[offset + i] * scale;
  }
  return dequantized;
}

export function faceDistance(
  face: CardFaceMatch,
  other: CardFaceMatch,
): number {
  const otherEmbedding = dequantizedFaceEmbedding(other);
  return face.isBackFace
    ? backFaceDistance(face.segment, face.row, otherEmbedding)
    : frontFaceDistance(face.segment, face.row, otherEmbedding);
}

export function closestPrintingInSets(
  segment: CardMatchSegment,
  name: string,
  setCodes: string[],
  query: Float32Array,
): CardFaceMatch | null {
  const wantedSetCodes = new Set(setCodes.map((code) => code.toLowerCase()));
  let closest: CardFaceMatch | null = null;
  for (let row = 0; row < segment.rowCount; row++) {
    if (
      nameOfRow(segment, row) !== name ||
      !wantedSetCodes.has(setCodeOfRow(segment, row).toLowerCase())
    ) {
      continue;
    }
    const face = closestFaceOfRow(segment, row, query);
    if (!closest || face.distance < closest.distance) closest = face;
  }
  return closest;
}

export function closestRegularPrinting(
  segments: CardMatchSegment[],
  name: string,
  query: Float32Array,
): CardFaceMatch | null {
  let closest: CardFaceMatch | null = null;
  for (const segment of segments) {
    for (let row = 0; row < segment.rowCount; row++) {
      if (
        segment.rarePrinting[row] === 1 ||
        nameOfRow(segment, row) !== name
      ) {
        continue;
      }
      const face = closestFaceOfRow(segment, row, query);
      if (!closest || face.distance < closest.distance) closest = face;
    }
  }
  return closest;
}

export function printingMarkGroupsOfRow(
  segment: CardMatchSegment,
  row: number,
): PrintingMarkGroups | null {
  const regionCount = segment.printingMarkRegionKeys.length;
  if (regionCount === 0) return null;
  const groups: PrintingMarkGroups = {};
  for (let regionIndex = 0; regionIndex < regionCount; regionIndex++) {
    const groupId =
      segment.printingMarkGroupIds[row * regionCount + regionIndex];
    if (groupId === PRINTING_MARK_GROUP_UNKNOWN) return null;
    if (groupId >= 0) {
      groups[
        segment.printingMarkRegionKeys[regionIndex] as keyof PrintingMarkGroups
      ] = segment.printingMarkGroupKeys[groupId];
    }
  }
  return groups;
}
