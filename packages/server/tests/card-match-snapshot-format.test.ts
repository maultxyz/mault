import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCardMatchSegment,
  cardIdOfRow,
  nameOfRow,
  nearestCardFaces,
  normalizedEmbedding,
} from "../src/lib/card-match-search";
import {
  decodeCardMatchSnapshot,
  encodeCardMatchSnapshot,
} from "../src/lib/card-match-snapshot-format";
import { MILO_EMBEDDING_DIM } from "../src/lib/constants/card-search";
import type { CardMatchSourceRow } from "../src/lib/interfaces/card-match-index";

function axisEmbedding(axis: number, lean = 0): Float32Array {
  const embedding = new Float32Array(MILO_EMBEDDING_DIM);
  embedding[axis] = 1;
  embedding[(axis + 1) % MILO_EMBEDDING_DIM] = lean;
  return embedding;
}

function sourceRow(
  cardId: string,
  embedding: Float32Array,
  overrides: Partial<CardMatchSourceRow> = {},
): CardMatchSourceRow {
  return {
    cardId,
    name: `Name of ${cardId}`,
    setCode: "set",
    collectorNumber: "1",
    rarePrinting: false,
    promoPrinting: false,
    embedding,
    backEmbedding: null,
    ...overrides,
  };
}

function sampleSegment() {
  return buildCardMatchSegment("mtg", "en", [
    sourceRow("0f4c1b7e-1d2a-4f5b-9c3d-2a1b0c9d8e7f", axisEmbedding(3), {
      rarePrinting: true,
      printedSetTotal: 198,
    }),
    sourceRow("text-card-id", axisEmbedding(0, 0.2), {
      collectorNumber: null,
      printedLanguageCode: true,
      backEmbedding: axisEmbedding(9),
    }),
    sourceRow("another-text-id", axisEmbedding(5), {
      promoPrinting: true,
      printingMarkGroups: { listIcon: "the-list" },
    }),
  ]);
}

test("a card match snapshot decodes to the same segment it was encoded from", () => {
  const segment = sampleSegment();
  const decoded = decodeCardMatchSnapshot(
    encodeCardMatchSnapshot(segment, "stamp"),
    "stamp",
  );

  assert.ok(decoded);
  assert.deepEqual(decoded, segment);
  const query = normalizedEmbedding(axisEmbedding(9));
  assert.deepEqual(
    nearestCardFaces([decoded], query, 3).map((face) => [
      cardIdOfRow(decoded, face.row),
      nameOfRow(decoded, face.row),
      face.isBackFace,
    ]),
    nearestCardFaces([segment], query, 3).map((face) => [
      cardIdOfRow(segment, face.row),
      nameOfRow(segment, face.row),
      face.isBackFace,
    ]),
  );
});

test("a card match snapshot with another stamp, format or a truncated body is not used", () => {
  const encoded = encodeCardMatchSnapshot(sampleSegment(), "stamp");

  assert.equal(decodeCardMatchSnapshot(encoded, "newer-stamp"), null);
  assert.equal(decodeCardMatchSnapshot(encoded.subarray(0, encoded.length - 16), "stamp"), null);
  assert.equal(decodeCardMatchSnapshot(Buffer.from("not a snapshot at all"), "stamp"), null);
});
