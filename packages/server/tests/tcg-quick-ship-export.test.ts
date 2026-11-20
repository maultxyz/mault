import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildExportCsv,
  exportEntryKey,
  tcgQuickShipAdapter,
  type ExportContext,
  type PlayingCardWithDistance,
} from "@magic-vault/shared";

const repeatOffender = {
  id: "mkm-101",
  name: "Repeat Offender",
  set: "mkm",
  setName: "Murders at Karlov Manor",
  collectorNumber: "101",
  rarity: "common",
  tcgplayerId: "7684240",
  lang: "en",
} as unknown as PlayingCardWithDistance;

const mtgContext: ExportContext = { isMtg: true, fieldDefinitions: [], gameKey: "mtg" };

function dataRows(csv: string): string[][] {
  return csv.trim().split("\n").slice(1).map((line) => line.split(","));
}

test("tcg quick ship export: one row per copy in scan order with sequence and bin", () => {
  const csv = buildExportCsv(
    tcgQuickShipAdapter,
    [
      { card: repeatOffender, isFoil: true, condition: "NM", language: "en", scannedAt: 2000, binNumber: 1 },
      { card: repeatOffender, isFoil: false, condition: "NM", language: "en", scannedAt: 1000, binNumber: 2 },
      { card: repeatOffender, isFoil: false, condition: "NM", language: "en", scannedAt: 3000, binNumber: 2 },
    ],
    mtgContext,
    true,
  );
  const rows = dataRows(csv);
  assert.equal(csv.split("\n")[0], "Card Name,Card #,Condition,Printing,Language,Rarity,Listing Price,Qty,Import Sequence,Bin,Set Name,TCGplayer ID");
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((row) => row[8]), ["1", "2", "3"]);
  assert.deepEqual(rows.map((row) => row[3]), ["Normal", "Foil", "Normal"]);
  assert.deepEqual(rows.map((row) => row[9]), ["Bin2", "Bin1", "Bin2"]);
  assert.deepEqual(rows[0], ["Repeat Offender", "101", "Near Mint", "Normal", "English", "common", "", "1", "1", "Bin2", "Murders at Karlov Manor", ""]);
});

test("tcg quick ship export: TCGplayer product details and SKU price win over the card", () => {
  const exportedCard = { card: repeatOffender, isFoil: false, condition: "NM" as const, language: "en" };
  const entryKey = exportEntryKey({ ...exportedCard, foilType: undefined, stamp: undefined });
  const csv = buildExportCsv(
    tcgQuickShipAdapter,
    [exportedCard],
    {
      ...mtgContext,
      tcgplayerSkusByEntryKey: {
        [entryKey]: {
          productId: "7684240",
          variant: "Normal",
          skuId: "123",
          marketPrice: 0.12,
          product: { name: "Repeat Offender", setName: "Murders at Karlov Manor", number: "101", rarity: "Common" },
        },
      },
    },
    false,
  );
  const [row] = dataRows(csv);
  assert.equal(row[5], "Common");
  assert.equal(row[6], "0.12");
  assert.equal(row[9], "");
  assert.equal(row[11], "123");
});
