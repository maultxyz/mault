import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCardSku,
  buildPosExportCsv,
  groupPosExportItems,
  type CardSkuInput,
  type PosExportCopy,
} from "@magic-vault/shared";

const BOLT: CardSkuInput = {
  gameKey: "mtg",
  cardId: "e3285e6b-3e79-4d7c-bf96-d920f973b80c",
  setCode: "m10",
  collectorNumber: "146",
  language: "en",
  isFoil: true,
  foilType: null,
  stamp: null,
  condition: "NM",
};

test("buildCardSku reads as game, set, number, language, finish and condition", () => {
  assert.match(buildCardSku(BOLT), /^MTG-M10-146-EN-F-NM-[0-9A-Z]{4}$/);
});

test("buildCardSku is stable for the same printing", () => {
  assert.equal(buildCardSku(BOLT), buildCardSku({ ...BOLT }));
});

test("buildCardSku separates parallel arts that share a collector number", () => {
  const regular = { ...BOLT, gameKey: "onepiece", cardId: "OP01-001", setCode: "OP01", collectorNumber: "OP01-001" };
  const parallel = { ...regular, cardId: "OP01-001_p1" };
  assert.notEqual(buildCardSku(regular), buildCardSku(parallel));
});

test("buildCardSku changes with condition, finish, foil type and stamp", () => {
  const sku = buildCardSku(BOLT);
  assert.notEqual(buildCardSku({ ...BOLT, condition: "LP" }), sku);
  assert.notEqual(buildCardSku({ ...BOLT, isFoil: false }), sku);
  assert.notEqual(buildCardSku({ ...BOLT, foilType: "etched" }), sku);
  assert.notEqual(buildCardSku({ ...BOLT, stamp: "1st Edition" }), sku);
  assert.match(buildCardSku({ ...BOLT, foilType: "Reverse Holofoil" }), /-RH-NM-/);
  assert.match(buildCardSku({ ...BOLT, isFoil: false }), /-N-NM-/);
});

test("buildCardSku keeps only barcode-safe characters", () => {
  assert.match(buildCardSku({ ...BOLT, setCode: "plst", collectorNumber: "M10-146★" }), /^[A-Z0-9-]+$/);
  assert.match(buildCardSku({ ...BOLT, gameKey: "newgame" }), /^NEW-/);
});

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let isQuoted = false;
  for (let index = 0; index < line.length; index++) {
    const character = line[index];
    if (isQuoted && character === '"' && line[index + 1] === '"') {
      value += '"';
      index++;
    } else if (character === '"') {
      isQuoted = !isQuoted;
    } else if (character === "," && !isQuoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  return [...values, value];
}

const copy = (overrides: Partial<PosExportCopy>): PosExportCopy => ({
  sku: "MTG-M10-146-EN-F-NM-AAAA",
  gameName: "Magic: The Gathering",
  name: "Lightning Bolt",
  setName: "Magic 2010",
  setCode: "m10",
  collectorNumber: "146",
  condition: "NM",
  isFoil: true,
  foilType: null,
  language: "en",
  price: 2.5,
  imageUrl: null,
  ...overrides,
});

test("groupPosExportItems counts copies per SKU and flags differing prices", () => {
  const items = groupPosExportItems([
    copy({}),
    copy({ price: 3 }),
    copy({ sku: "OTHER", price: 1 }),
    copy({ sku: "OTHER", price: 1 }),
  ]);
  assert.deepEqual(
    items.map(({ sku, quantity, price, hasMixedPrices }) => ({ sku, quantity, price, hasMixedPrices })),
    [
      { sku: "MTG-M10-146-EN-F-NM-AAAA", quantity: 2, price: 2.5, hasMixedPrices: true },
      { sku: "OTHER", quantity: 2, price: 1, hasMixedPrices: false },
    ],
  );
});

test("buildPosExportCsv writes Shopify, Square and SKU files with the SKU as barcode", () => {
  const items = groupPosExportItems([copy({}), copy({})]);
  const [shopifyHeader, shopifyRow] = buildPosExportCsv("shopify", items, { currency: "USD" }).split("\n");
  const shopifyColumns = parseCsvLine(shopifyHeader);
  const shopifyValues = parseCsvLine(shopifyRow);
  const shopifyValue = (column: string) => shopifyValues[shopifyColumns.indexOf(column)];
  assert.equal(shopifyValue("Variant SKU"), "MTG-M10-146-EN-F-NM-AAAA");
  assert.equal(shopifyValue("Variant Barcode"), "MTG-M10-146-EN-F-NM-AAAA");
  assert.equal(shopifyValue("Variant Inventory Qty"), "2");
  assert.equal(shopifyValue("Variant Price"), "2.50");
  assert.equal(shopifyValue("Handle"), "mtg-m10-146-en-f-nm-aaaa");
  assert.equal(shopifyValue("Tags"), "Magic: The Gathering, Magic 2010");

  const [squareHeader, squareRow] = buildPosExportCsv("square", items, { currency: "USD" }).split("\n");
  assert.equal(squareHeader, "Token,Item Name,Variation Name,SKU,Description,Category,Price,Sellable,Stockable");
  assert.ok(squareRow.includes(",MTG-M10-146-EN-F-NM-AAAA,"));

  const [skuHeader, skuRow] = buildPosExportCsv("sku", items, { currency: "USD" }).split("\n");
  assert.ok(skuHeader.startsWith("SKU,Barcode,Name,"));
  assert.ok(skuRow.endsWith(",2.50,USD,2"));
});

test("buildPosExportCsv leaves the price empty when a copy has none", () => {
  const [, row] = buildPosExportCsv("sku", groupPosExportItems([copy({ price: null })]), {
    currency: "USD",
  }).split("\n");
  assert.ok(row.endsWith(",,USD,1"));
});
