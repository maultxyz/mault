import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createCardMatchEmbeddingDecoder,
  supportsHalfvecTransfer,
} from "../src/lib/card-match-embedding-decoder";
import { MILO_EMBEDDING_DIM } from "../src/lib/constants/card-search";

function sampleEmbedding(): Float32Array {
  const embedding = new Float32Array(MILO_EMBEDDING_DIM);
  for (let i = 0; i < embedding.length; i++) {
    embedding[i] = Math.sin(i * 0.37) * (i % 7 === 0 ? 0.5 : 0.08);
  }
  return embedding;
}

function vectorSendBytes(embedding: Float32Array, dimensions = embedding.length): Buffer {
  const bytes = Buffer.alloc(4 + embedding.length * 4);
  bytes.writeUInt16BE(dimensions, 0);
  embedding.forEach((value, index) => bytes.writeFloatBE(value, 4 + index * 4));
  return bytes;
}

function float32ToHalfBits(value: number): number {
  const floatView = new Float32Array([value]);
  const bits = new Uint32Array(floatView.buffer)[0];
  const sign = (bits >>> 16) & 0x8000;
  const exponent = ((bits >>> 23) & 0xff) - 127 + 15;
  const mantissa = bits & 0x7fffff;
  if (exponent <= 0) {
    if (exponent < -10) return sign;
    const subnormalMantissa = (mantissa | 0x800000) >> (1 - exponent);
    return sign | Math.round(subnormalMantissa / 0x2000);
  }
  const rounded = Math.round(mantissa / 0x2000);
  if (rounded === 0x400) return sign | ((exponent + 1) << 10);
  return sign | (exponent << 10) | rounded;
}

function halfvecSendBytes(embedding: Float32Array): Buffer {
  const bytes = Buffer.alloc(4 + embedding.length * 2);
  bytes.writeUInt16BE(embedding.length, 0);
  embedding.forEach((value, index) =>
    bytes.writeUInt16BE(float32ToHalfBits(value), 4 + index * 2),
  );
  return bytes;
}

test("decodes pgvector vector_send bytes exactly", () => {
  const embedding = sampleEmbedding();
  const decode = createCardMatchEmbeddingDecoder("vector");
  assert.deepEqual(Array.from(decode(vectorSendBytes(embedding))!), Array.from(embedding));
});

test("decodes pgvector halfvec_send bytes within half precision", () => {
  const embedding = sampleEmbedding();
  const decoded = createCardMatchEmbeddingDecoder("halfvec")(halfvecSendBytes(embedding))!;
  for (let i = 0; i < embedding.length; i++) {
    const tolerance = Math.max(Math.abs(embedding[i]) * 2 ** -10, 2 ** -24);
    assert.ok(
      Math.abs(decoded[i] - embedding[i]) <= tolerance,
      `index ${i}: ${decoded[i]} vs ${embedding[i]}`,
    );
  }
});

test("returns null for a missing back embedding", () => {
  assert.equal(createCardMatchEmbeddingDecoder("vector")(null), null);
  assert.equal(createCardMatchEmbeddingDecoder("halfvec")(null), null);
});

test("rejects embeddings with the wrong dimension count", () => {
  const decode = createCardMatchEmbeddingDecoder("vector");
  assert.throws(
    () => decode(vectorSendBytes(sampleEmbedding(), MILO_EMBEDDING_DIM - 1)),
    /dimensions/,
  );
});

test("reuses one output buffer per decoder, so front and back need their own", () => {
  const decodeFront = createCardMatchEmbeddingDecoder("vector");
  const decodeBack = createCardMatchEmbeddingDecoder("vector");
  const front = decodeFront(vectorSendBytes(sampleEmbedding()));
  const back = decodeBack(vectorSendBytes(sampleEmbedding().map((value) => -value)));
  assert.notEqual(front, back);
  assert.equal(front![1], -back![1]);
});

test("uses halfvec transfer only from pgvector 0.7.0", () => {
  assert.equal(supportsHalfvecTransfer(null), false);
  assert.equal(supportsHalfvecTransfer("0.5.1"), false);
  assert.equal(supportsHalfvecTransfer("0.6.2"), false);
  assert.equal(supportsHalfvecTransfer("0.7.0"), true);
  assert.equal(supportsHalfvecTransfer("0.8.0"), true);
  assert.equal(supportsHalfvecTransfer("1.0"), true);
});
