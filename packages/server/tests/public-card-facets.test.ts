import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizePublicCardFacetRows } from "../src/lib/public-card-facets";

test("public card facets: one grouped scan yields conditions, languages and finish counts", () => {
  const facets = summarizePublicCardFacetRows([
    { condition: "NM", language: "en", is_foil: false, count: 5 },
    { condition: "NM", language: "ja", is_foil: true, count: "2" },
    { condition: "LP", language: "en", is_foil: true, count: 8 },
  ]);
  assert.deepEqual(facets, {
    conditions: [
      { key: "LP", count: 8 },
      { key: "NM", count: 7 },
    ],
    languages: [
      { key: "en", count: 13 },
      { key: "ja", count: 2 },
    ],
    foilCount: 10,
    nonFoilCount: 5,
  });
});

test("public card facets: no cards means empty facets", () => {
  assert.deepEqual(summarizePublicCardFacetRows([]), {
    conditions: [],
    languages: [],
    foilCount: 0,
    nonFoilCount: 0,
  });
});
