import { endianness } from "node:os";
import {
  CARD_MATCH_EMBEDDING_SEND_HEADER_BYTES,
  CARD_MATCH_HALFVEC_MIN_PGVECTOR_VERSION,
  MILO_EMBEDDING_DIM,
} from "./constants/card-search";
import type {
  CardMatchEmbeddingDecoder,
  CardMatchEmbeddingTransferFormat,
} from "./interfaces/card-match-index";

let float32ByHalfBits: Float32Array | null = null;

function halfBitsToFloat32(halfBits: number): number {
  const sign = halfBits & 0x8000 ? -1 : 1;
  const exponent = (halfBits >> 10) & 0x1f;
  const mantissa = halfBits & 0x3ff;
  if (exponent === 0) return sign * 2 ** -14 * (mantissa / 1024);
  if (exponent === 0x1f) return mantissa ? Number.NaN : sign * Infinity;
  return sign * 2 ** (exponent - 15) * (1 + mantissa / 1024);
}

function float32LookupByHalfBits(): Float32Array {
  if (float32ByHalfBits) return float32ByHalfBits;
  const table = new Float32Array(0x10000);
  for (let halfBits = 0; halfBits < table.length; halfBits++) {
    table[halfBits] = halfBitsToFloat32(halfBits);
  }
  float32ByHalfBits = table;
  return table;
}

function assertEmbeddingDimensions(bytes: Uint8Array) {
  const dimensions = (bytes[0] << 8) | bytes[1];
  if (dimensions !== MILO_EMBEDDING_DIM) {
    throw new Error(
      `Stored embedding has ${dimensions} dimensions, expected ${MILO_EMBEDDING_DIM}.`,
    );
  }
}

export function createCardMatchEmbeddingDecoder(
  transferFormat: CardMatchEmbeddingTransferFormat,
): CardMatchEmbeddingDecoder {
  if (endianness() !== "LE") {
    throw new Error("Card match embedding decoding needs a little-endian host.");
  }
  const decodedEmbedding = new Float32Array(MILO_EMBEDDING_DIM);
  const littleEndianFloatBytes = new Uint8Array(decodedEmbedding.buffer);
  const halfLookup =
    transferFormat === "halfvec" ? float32LookupByHalfBits() : null;

  return (sentBytes) => {
    if (!sentBytes) return null;
    assertEmbeddingDimensions(sentBytes);
    const valuesStart = CARD_MATCH_EMBEDDING_SEND_HEADER_BYTES;
    if (halfLookup) {
      for (let i = 0; i < MILO_EMBEDDING_DIM; i++) {
        const byteIndex = valuesStart + i * 2;
        decodedEmbedding[i] =
          halfLookup[(sentBytes[byteIndex] << 8) | sentBytes[byteIndex + 1]];
      }
      return decodedEmbedding;
    }
    for (let i = 0; i < MILO_EMBEDDING_DIM; i++) {
      const sourceIndex = valuesStart + i * 4;
      const targetIndex = i * 4;
      littleEndianFloatBytes[targetIndex] = sentBytes[sourceIndex + 3];
      littleEndianFloatBytes[targetIndex + 1] = sentBytes[sourceIndex + 2];
      littleEndianFloatBytes[targetIndex + 2] = sentBytes[sourceIndex + 1];
      littleEndianFloatBytes[targetIndex + 3] = sentBytes[sourceIndex];
    }
    return decodedEmbedding;
  };
}

function versionParts(version: string): number[] {
  return version.split(".").map((part) => Number.parseInt(part, 10) || 0);
}

export function supportsHalfvecTransfer(pgvectorVersion: string | null): boolean {
  if (!pgvectorVersion) return false;
  const installed = versionParts(pgvectorVersion);
  const required = versionParts(CARD_MATCH_HALFVEC_MIN_PGVECTOR_VERSION);
  for (let i = 0; i < required.length; i++) {
    const difference = (installed[i] ?? 0) - required[i];
    if (difference !== 0) return difference > 0;
  }
  return true;
}
