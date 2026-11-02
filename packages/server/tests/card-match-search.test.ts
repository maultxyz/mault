import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCardMatchSegment,
  closestPrintingInSets,
  faceDistance,
  nearestCardFaces,
  normalizedEmbedding,
} from "../src/lib/card-match-search";
import { MILO_EMBEDDING_DIM } from "../src/lib/constants/card-search";
import type { CardMatchSourceRow } from "../src/lib/interfaces/card-match-index";
import { createKeyedCache } from "../src/lib/keyed-cache";

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
    name: cardId,
    setCode: "set",
    rarePrinting: false,
    embedding,
    backEmbedding: null,
    ...overrides,
  };
}

test("nearest card faces rank by cosine distance and keep the closest face per card", () => {
  const segment = buildCardMatchSegment("mtg", "en", [
    sourceRow("far", axisEmbedding(5)),
    sourceRow("close", axisEmbedding(0, 0.2)),
    sourceRow("double-faced", axisEmbedding(7), {
      backEmbedding: axisEmbedding(0, 0.05),
    }),
    sourceRow("exact", axisEmbedding(0).map((value) => value * 3)),
  ]);
  const nearest = nearestCardFaces([segment], normalizedEmbedding(axisEmbedding(0)), 3);

  assert.deepEqual(
    nearest.map((face) => segment.cardIds[face.row]),
    ["exact", "double-faced", "close"],
  );
  assert.ok(Math.abs(nearest[0].distance) < 1e-6);
  assert.equal(nearest[1].isBackFace, true);
  assert.equal(nearest[2].isBackFace, false);
  const expectedCloseDistance = 1 - 1 / Math.sqrt(1 + 0.2 * 0.2);
  assert.ok(Math.abs(nearest[2].distance - expectedCloseDistance) < 1e-6);
});

test("nearest card faces merge segments and measure distance to the leader face", () => {
  const english = buildCardMatchSegment("mtg", "en", [
    sourceRow("en-card", axisEmbedding(0, 0.1)),
  ]);
  const german = buildCardMatchSegment("mtg", "de", [
    sourceRow("de-card", axisEmbedding(0)),
    sourceRow("de-other", axisEmbedding(9)),
  ]);
  const nearest = nearestCardFaces(
    [english, german],
    normalizedEmbedding(axisEmbedding(0)),
    2,
  );

  assert.deepEqual(
    nearest.map((face) => face.segment.lang),
    ["de", "en"],
  );
  assert.equal(faceDistance(nearest[0], nearest[0]), 0);
  assert.ok(faceDistance(nearest[1], nearest[0]) > 0);
});

test("closest printing in sets matches name and any set code case-insensitively", () => {
  const segment = buildCardMatchSegment("mtg", "en", [
    sourceRow("a", axisEmbedding(0, 0.5), { name: "Bolt", setCode: "LEA" }),
    sourceRow("b", axisEmbedding(0, 0.1), { name: "Bolt", setCode: "lea" }),
    sourceRow("c", axisEmbedding(0), { name: "Bolt", setCode: "m10" }),
  ]);
  const query = normalizedEmbedding(axisEmbedding(0));

  const preferred = closestPrintingInSets(segment, "Bolt", ["Lea"], query);
  assert.equal(preferred && segment.cardIds[preferred.row], "b");
  const either = closestPrintingInSets(segment, "Bolt", ["2ed", "M10", "LEA"], query);
  assert.equal(either && segment.cardIds[either.row], "c");
  assert.equal(closestPrintingInSets(segment, "Bolt", ["2ed"], query), null);
});

test("normalized embedding rejects the wrong dimension", () => {
  assert.throws(() => normalizedEmbedding([1, 2, 3]));
});

test("keyed cache shares in-flight loads and never caches null", async () => {
  const cache = createKeyedCache<string | null>(60_000, 10);
  let loads = 0;
  const load = async () => {
    loads++;
    return "value";
  };
  const [first, second] = await Promise.all([
    cache.get("key", load),
    cache.get("key", load),
  ]);
  assert.equal(first, "value");
  assert.equal(second, "value");
  await cache.get("key", load);
  assert.equal(loads, 1);

  let nullLoads = 0;
  const loadNull = async () => {
    nullLoads++;
    return null;
  };
  await cache.get("missing", loadNull);
  await cache.get("missing", loadNull);
  assert.equal(nullLoads, 2);
});
