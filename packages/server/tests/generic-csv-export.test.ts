import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildExportCsv,
  csvAdapter,
  DEFAULT_CONDITION_MULTIPLIERS,
  type ExportContext,
  type FieldMeta,
  type PlayingCardWithDistance,
} from "@magic-vault/shared";

const fieldDefinitions = [
  { field: "name", path: "name", label: "Name", type: "string", operators: [] },
  { field: "prices.usd", path: "prices.usd", label: "Price (USD)", type: "numeric", operators: [] },
  { field: "prices.eur", path: "prices.eur", label: "Price (EUR)", type: "numeric", operators: [] },
  { field: "rarity", path: "rarity", label: "Rarity", type: "string", operators: [] },
] as unknown as FieldMeta[];

const card = {
  id: "mkm-101",
  name: "Repeat Offender",
  set: "mkm",
  collectorNumber: "101",
  rarity: "common",
  lang: "en",
  prices: { usd: "9.99", eur: "8.88" },
  price: 1.5,
  priceFoil: 4,
  priceEur: 1.25,
  priceEurFoil: 3,
} as unknown as PlayingCardWithDistance;

const baseContext: ExportContext = { isMtg: true, fieldDefinitions, gameKey: "mtg" };

function csvLines(ctx: ExportContext): string[][] {
  return buildExportCsv(
    csvAdapter,
    [
      { card, isFoil: false, condition: "NM", language: "en" },
      { card, isFoil: true, condition: "NM", language: "en" },
    ],
    ctx,
    true,
  )
    .split("\n")
    .map((line) => line.split(","));
}

test("generic csv export: replaces game price fields with the primary price source", () => {
  const [headers, nonFoil, foil] = csvLines({
    ...baseContext,
    pricing: { source: "cardmarket", conditionMultipliers: DEFAULT_CONDITION_MULTIPLIERS },
  });
  assert.deepEqual(headers.slice(8), ["Name", "Cardmarket Price (EUR)", "Rarity"]);
  assert.deepEqual(nonFoil.slice(8), ["Repeat Offender", "1.25", "common"]);
  assert.deepEqual(foil.slice(8), ["Repeat Offender", "3.00", "common"]);
});

test("generic csv export: keeps game price fields without org pricing", () => {
  const [headers, nonFoil] = csvLines(baseContext);
  assert.deepEqual(headers.slice(8), ["Name", "Price (USD)", "Price (EUR)", "Rarity"]);
  assert.deepEqual(nonFoil.slice(8), ["Repeat Offender", "9.99", "8.88", "common"]);
});
