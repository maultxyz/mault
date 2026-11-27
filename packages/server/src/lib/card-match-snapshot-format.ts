import {
  CARD_MATCH_ARRAYS_SHARED_WITH_WORKERS,
  CARD_MATCH_SNAPSHOT_ALIGNMENT_BYTES,
  CARD_MATCH_SNAPSHOT_ARRAY_FIELDS,
  CARD_MATCH_SNAPSHOT_FORMAT_VERSION,
  CARD_MATCH_SNAPSHOT_MAGIC,
} from "./constants/card-search";
import type {
  CardMatchSegment,
  CardMatchSnapshotArrayField,
  CardMatchSnapshotHeader,
} from "./interfaces/card-match-index";

const MAGIC_BYTES = Buffer.from(CARD_MATCH_SNAPSHOT_MAGIC, "ascii");
const HEADER_LENGTH_BYTES = 4;

function alignedLength(length: number): number {
  return (
    Math.ceil(length / CARD_MATCH_SNAPSHOT_ALIGNMENT_BYTES) *
    CARD_MATCH_SNAPSHOT_ALIGNMENT_BYTES
  );
}

export function encodeCardMatchSnapshot(
  segment: CardMatchSegment,
  stamp: string,
): Buffer {
  const arrayLengths = Object.fromEntries(
    CARD_MATCH_SNAPSHOT_ARRAY_FIELDS.map(([field]) => [field, segment[field].length]),
  ) as Record<CardMatchSnapshotArrayField, number>;
  const header: CardMatchSnapshotHeader = {
    formatVersion: CARD_MATCH_SNAPSHOT_FORMAT_VERSION,
    stamp,
    gameKey: segment.gameKey,
    lang: segment.lang,
    rowCount: segment.rowCount,
    textBytes: segment.textBytes,
    cardIdTextBlob: segment.cardIdTextBlob,
    nameTable: segment.nameTable,
    setCodeTable: segment.setCodeTable,
    collectorNumberTable: segment.collectorNumberTable,
    printingMarkRegionKeys: segment.printingMarkRegionKeys,
    printingMarkGroupKeys: segment.printingMarkGroupKeys,
    arrayLengths,
  };
  const headerBytes = Buffer.from(JSON.stringify(header), "utf8");
  const headerLength = Buffer.alloc(HEADER_LENGTH_BYTES);
  headerLength.writeUInt32LE(headerBytes.length);
  const prefixLength = MAGIC_BYTES.length + HEADER_LENGTH_BYTES + headerBytes.length;
  const parts: Buffer[] = [
    MAGIC_BYTES,
    headerLength,
    headerBytes,
    Buffer.alloc(alignedLength(prefixLength) - prefixLength),
  ];
  for (const [field] of CARD_MATCH_SNAPSHOT_ARRAY_FIELDS) {
    const array = segment[field];
    parts.push(Buffer.from(array.buffer, array.byteOffset, array.byteLength));
    parts.push(Buffer.alloc(alignedLength(array.byteLength) - array.byteLength));
  }
  return Buffer.concat(parts);
}

export function decodeCardMatchSnapshot(
  snapshot: Buffer,
  expectedStamp: string,
): CardMatchSegment | null {
  if (!snapshot.subarray(0, MAGIC_BYTES.length).equals(MAGIC_BYTES)) return null;
  const headerLength = snapshot.readUInt32LE(MAGIC_BYTES.length);
  const headerStart = MAGIC_BYTES.length + HEADER_LENGTH_BYTES;
  const header = JSON.parse(
    snapshot.subarray(headerStart, headerStart + headerLength).toString("utf8"),
  ) as CardMatchSnapshotHeader;
  if (
    header.formatVersion !== CARD_MATCH_SNAPSHOT_FORMAT_VERSION ||
    header.stamp !== expectedStamp
  ) {
    return null;
  }
  let offset = alignedLength(headerStart + headerLength);
  const arrays = {} as Record<CardMatchSnapshotArrayField, CardMatchSegment[CardMatchSnapshotArrayField]>;
  for (const [field, TypedArray] of CARD_MATCH_SNAPSHOT_ARRAY_FIELDS) {
    const length = header.arrayLengths[field];
    const array = CARD_MATCH_ARRAYS_SHARED_WITH_WORKERS.has(field)
      ? new TypedArray(new SharedArrayBuffer(length * TypedArray.BYTES_PER_ELEMENT))
      : new TypedArray(length);
    const end = offset + array.byteLength;
    if (end > snapshot.length) return null;
    new Uint8Array(array.buffer).set(snapshot.subarray(offset, end));
    arrays[field] = array;
    offset = alignedLength(end);
  }
  return {
    gameKey: header.gameKey,
    lang: header.lang,
    rowCount: header.rowCount,
    textBytes: header.textBytes,
    cardIdTextBlob: header.cardIdTextBlob,
    nameTable: header.nameTable,
    setCodeTable: header.setCodeTable,
    collectorNumberTable: header.collectorNumberTable,
    printingMarkRegionKeys: header.printingMarkRegionKeys,
    printingMarkGroupKeys: header.printingMarkGroupKeys,
    ...arrays,
  } as CardMatchSegment;
}
