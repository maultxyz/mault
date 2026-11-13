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
        isFoilVariant: false,
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
