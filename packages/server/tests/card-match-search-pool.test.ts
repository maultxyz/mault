import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCardMatchSegment,
  nearestCardFaces,
  nearestCardFacesOffMainThread,
  normalizedEmbedding,
} from "../src/lib/card-match-search";
import { cardMatchSearchWorkerCount } from "../src/lib/card-match-search-pool";
import {
  CARD_MATCH_SEARCH_WORKER_COUNT_ENV,
  MILO_EMBEDDING_DIM,
} from "../src/lib/constants/card-search";
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
  backEmbedding: Float32Array | null = null,
): CardMatchSourceRow {
  return {
    cardId,
    name: cardId,
    setCode: "set",
    collectorNumber: null,
    rarePrinting: false,
    promoPrinting: false,
    embedding,
    backEmbedding,
  };
}

function summaryOf(faces: Awaited<ReturnType<typeof nearestCardFacesOffMainThread>>) {
  return faces.map((face) => [
    face.segment.lang,
    face.row,
    face.isBackFace,
    face.distance,
  ]);
}

test("built segments keep their embeddings in memory shared with workers", () => {
  const segment = buildCardMatchSegment("mtg", "en", [
    sourceRow("front-only", axisEmbedding(1)),
    sourceRow("double-faced", axisEmbedding(2), axisEmbedding(3)),
  ]);

  assert.ok(segment.frontEmbeddings.buffer instanceof SharedArrayBuffer);
  assert.ok(segment.frontEmbeddingScales.buffer instanceof SharedArrayBuffer);
  assert.ok(segment.backEmbeddings.buffer instanceof SharedArrayBuffer);
  assert.ok(segment.backEmbeddingScales.buffer instanceof SharedArrayBuffer);
  assert.ok(segment.backFaceIndexByRow.buffer instanceof SharedArrayBuffer);
});

test("searching in worker threads returns the same faces as the main thread", async () => {
  const english = buildCardMatchSegment("mtg", "en", [
    sourceRow("far", axisEmbedding(5)),
    sourceRow("close", axisEmbedding(0, 0.2)),
    sourceRow("double-faced", axisEmbedding(7), axisEmbedding(0, 0.05)),
    sourceRow("exact", axisEmbedding(0)),
  ]);
  const german = buildCardMatchSegment("mtg", "de", [
    sourceRow("near", axisEmbedding(0, 0.1)),
    sourceRow("elsewhere", axisEmbedding(9)),
  ]);
  const query = normalizedEmbedding(axisEmbedding(0));

  assert.ok(cardMatchSearchWorkerCount() > 0);
  const searches = await Promise.all(
    Array.from({ length: 12 }, () =>
      nearestCardFacesOffMainThread([english, german], query, 4),
    ),
  );

  const expected = summaryOf(nearestCardFaces([english, german], query, 4));
  for (const faces of searches) assert.deepEqual(summaryOf(faces), expected);
});

test("a worker count of zero searches on the main thread", async () => {
  const segment = buildCardMatchSegment("mtg", "en", [
    sourceRow("only", axisEmbedding(0)),
  ]);
  const query = normalizedEmbedding(axisEmbedding(0));
  process.env[CARD_MATCH_SEARCH_WORKER_COUNT_ENV] = "0";
  try {
    assert.equal(cardMatchSearchWorkerCount(), 0);
    assert.deepEqual(
      summaryOf(await nearestCardFacesOffMainThread([segment], query, 1)),
      summaryOf(nearestCardFaces([segment], query, 1)),
    );
  } finally {
    delete process.env[CARD_MATCH_SEARCH_WORKER_COUNT_ENV];
  }
});
