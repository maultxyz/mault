import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCardMatchSegment,
  cardIdOfRow,
  cardRowDistance,
  closestPrintingInSets,
  collectorNumberOfRow,
  closestRegularPrinting,
  faceDistance,
  nearestCardFaces,
  nameOfRow,
  normalizedEmbedding,
  setCodeOfRow,
} from "../src/lib/card-match-search";
import { MILO_EMBEDDING_DIM } from "../src/lib/constants/card-search";
import type { CardMatchSourceRow } from "../src/lib/interfaces/card-match-index";
import { createKeyedCache } from "../src/lib/keyed-cache";

const INT8_DISTANCE_TOLERANCE = 2e-3;

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
    collectorNumber: null,
    rarePrinting: false,
    promoPrinting: false,
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
    nearest.map((face) => cardIdOfRow(segment, face.row)),
    ["exact", "double-faced", "close"],
  );
  assert.ok(Math.abs(nearest[0].distance) < 1e-6);
  assert.equal(nearest[1].isBackFace, true);
  assert.equal(nearest[2].isBackFace, false);
  const expectedCloseDistance = 1 - 1 / Math.sqrt(1 + 0.2 * 0.2);
  assert.ok(
    Math.abs(nearest[2].distance - expectedCloseDistance) <
      INT8_DISTANCE_TOLERANCE,
  );
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
  assert.ok(Math.abs(faceDistance(nearest[0], nearest[0])) < 1e-6);
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
  assert.equal(preferred && cardIdOfRow(segment, preferred.row), "b");
  const either = closestPrintingInSets(segment, "Bolt", ["2ed", "M10", "LEA"], query);
  assert.equal(either && cardIdOfRow(segment, either.row), "c");
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

test("the closest regular printing is found across the whole index, skipping promos and other names", () => {
  const segment = buildCardMatchSegment("mtg", "en", [
    sourceRow("promo", axisEmbedding(0), { name: "Plains", rarePrinting: true }),
    sourceRow("other-card", axisEmbedding(0, 0.1), { name: "Island" }),
    sourceRow("far-regular", axisEmbedding(3), { name: "Plains" }),
    sourceRow("near-regular", axisEmbedding(0, 0.9), { name: "Plains" }),
  ]);
  const closest = closestRegularPrinting(
    [segment],
    "Plains",
    normalizedEmbedding(axisEmbedding(0)),
  );
  assert.equal(closest && cardIdOfRow(segment, closest.row), "near-regular");
  assert.equal(
    closestRegularPrinting([segment], "Swamp", normalizedEmbedding(axisEmbedding(0))),
    null,
  );
});

test("the match index round-trips card ids and interns repeated text", () => {
  const uuid = "0a1b2c3d-4e5f-6071-8293-a4b5c6d7e8f9";
  const segment = buildCardMatchSegment("mtg", "en", [
    sourceRow(uuid, axisEmbedding(0), {
      name: "Bolt",
      setCode: "lea",
      collectorNumber: "161",
    }),
    sourceRow("tcgp-12345", axisEmbedding(1), {
      name: "Bolt",
      setCode: "lea",
      collectorNumber: null,
    }),
    sourceRow("0A1B2C3D-4E5F-6071-8293-A4B5C6D7E8F9", axisEmbedding(2), {
      name: "Shock",
      setCode: "m19",
      collectorNumber: "161",
    }),
  ]);
  assert.deepEqual(
    [0, 1, 2].map((row) => cardIdOfRow(segment, row)),
    [uuid, "tcgp-12345", "0A1B2C3D-4E5F-6071-8293-A4B5C6D7E8F9"],
  );
  assert.deepEqual(
    [0, 1, 2].map((row) => [
      nameOfRow(segment, row),
      setCodeOfRow(segment, row),
      collectorNumberOfRow(segment, row),
    ]),
    [
      ["Bolt", "lea", "161"],
      ["Bolt", "lea", null],
      ["Shock", "m19", "161"],
    ],
  );
  assert.deepEqual(segment.nameTable, ["Bolt", "Shock"]);
  assert.deepEqual(segment.collectorNumberTable, ["161"]);
});

test("int8 embeddings keep cosine distances within tolerance of float32", () => {
  let seed = 7;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648 - 0.5;
  };
  const randomEmbedding = () =>
    normalizedEmbedding(Float32Array.from({ length: MILO_EMBEDDING_DIM }, random));
  const embeddings = Array.from({ length: 200 }, randomEmbedding);
  const segment = buildCardMatchSegment(
    "mtg",
    "en",
    embeddings.map((embedding, index) => sourceRow(`card-${index}`, embedding)),
  );
  for (let queryIndex = 0; queryIndex < 20; queryIndex++) {
    const query = randomEmbedding();
    embeddings.forEach((embedding, row) => {
      let dot = 0;
      for (let i = 0; i < MILO_EMBEDDING_DIM; i++) dot += embedding[i] * query[i];
      assert.ok(
        Math.abs(cardRowDistance(segment, row, query) - (1 - dot)) <
          INT8_DISTANCE_TOLERANCE * 5,
      );
    });
  }
});
