import assert from "node:assert/strict";
import { test } from "node:test";
import {
  allExportAdapters,
  buildExportCsv,
  exportEntryKey,
  type ExportContext,
  type PlayingCardWithDistance,
} from "@magic-vault/shared";

const tcgplayerAdapter = allExportAdapters.find(
  (adapter) => adapter.key === "tcgplayer",
)!;

const bronzor = {
  id: "sv8pt5-063",
  name: "Bronzor",
  set: "sv8pt5",
  setName: "Prismatic Evolutions",
  collectorNumber: "063",
  rarity: "Common",
  tcgplayerId: "610421",
  lang: "en",
} as unknown as PlayingCardWithDistance;

const exportedCard = {
  card: bronzor,
  isFoil: false,
  condition: "NM" as const,
  language: "en",
};

function firstDataRow(ctx: ExportContext): string[] {
  const csv = buildExportCsv(tcgplayerAdapter, [exportedCard], ctx, true);
  return csv.trim().split("\n")[1].split(",");
}

test("tcgplayer export: a card with a SKU exports the SKU id", () => {
  const entryKey = exportEntryKey({ ...exportedCard, foilType: undefined, stamp: undefined });
  const row = firstDataRow({
    isMtg: false,
    fieldDefinitions: [],
    gameKey: "pokemon",
    tcgplayerSkusByEntryKey: {
      [entryKey]: {
        productId: "610421",
        variant: "Normal",
        skuId: "8488983",
        marketPrice: 0.05,
        product: { name: "Bronzor", setName: "SV: Prismatic Evolutions", number: "063/131", rarity: "Common" },
      },
    },
  });
  assert.equal(row[0], "8488983");
});

test("tcgplayer export: a card without a SKU never falls back to the product id", () => {
  const row = firstDataRow({
    isMtg: false,
    fieldDefinitions: [],
    gameKey: "pokemon",
    tcgplayerSkusByEntryKey: {},
  });
  assert.equal(row[0], "");
});

function conditionForVariant(variant: string, isFoil: boolean, foilType?: string): string {
  const entry = { ...exportedCard, isFoil, foilType };
  const entryKey = exportEntryKey({ ...entry, stamp: undefined });
  const csv = buildExportCsv(
    tcgplayerAdapter,
    [entry],
    {
      isMtg: false,
      fieldDefinitions: [],
      gameKey: "pokemon",
      tcgplayerSkusByEntryKey: {
        [entryKey]: {
          productId: "610421",
          variant,
          skuId: "8488983",
          marketPrice: 0.05,
          product: null,
        },
      },
    },
    true,
  );
  return csv.trim().split("\n")[1].split(",")[6];
}

test("tcgplayer export: the condition carries TCGplayer's printing name", () => {
  assert.equal(conditionForVariant("Normal", false), "Near Mint");
  assert.equal(conditionForVariant("Holofoil", true, "Holo"), "Near Mint Holofoil");
  assert.equal(conditionForVariant("Reverse Holofoil", true, "Reverse Holo"), "Near Mint Reverse Holofoil");
  assert.equal(conditionForVariant("1st Edition Holofoil", true, "Holo"), "Near Mint 1st Edition Holofoil");
  assert.equal(conditionForVariant("1st Edition Normal", false), "Near Mint 1st Edition");
  assert.equal(conditionForVariant("Foil", true), "Near Mint Foil");
});
