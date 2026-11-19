import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cardPriceSortCurrencyOf,
  cardPriceSortSource,
  cardSortableFields,
  type FieldMeta,
} from "@magic-vault/shared";

const LABELS = { USD: "Price (USD)", EUR: "Price (EUR)" };

function field(fieldName: string, path: string, label: string, type: FieldMeta["type"] = "numeric"): FieldMeta {
  return { field: fieldName, path, label, type, operators: [] };
}

test("every game price field collapses into one sort per currency, in place of the first price field", () => {
  const sortable = cardSortableFields(
    [
      field("name", "name", "Name", "string"),
      field("price_usd", "prices.usd", "Price (USD)"),
      field("priceFoil", "priceFoil", "Foil Price"),
      field("priceFoilEur", "priceFoilEur", "Price Foil (EUR)"),
      field("set", "set", "Set", "string"),
    ],
    "tcgplayer",
    LABELS,
  );
  assert.deepEqual(
    sortable.map((meta) => meta.field),
    ["name", "$price.usd", "$price.eur", "set"],
  );
});

test("a game without price fields still sorts by the org's own currency", () => {
  const sortable = cardSortableFields([field("name", "name", "Name", "string")], "cardmarket", LABELS);
  assert.deepEqual(sortable.map((meta) => meta.field), ["name", "$price.eur"]);
});

test("string price fields such as Yu-Gi-Oh's are replaced too", () => {
  const sortable = cardSortableFields(
    [field("card_prices_0_tcgplayer_price", "card_prices.0.tcgplayer_price", "Price (USD)", "string")],
    "tcgplayer",
    LABELS,
  );
  assert.deepEqual(sortable.map((meta) => meta.field), ["$price.usd"]);
});

test("each currency sorts by the org's source when it matches, else the default store", () => {
  assert.equal(cardPriceSortSource("USD", "cardkingdom"), "cardkingdom");
  assert.equal(cardPriceSortSource("USD", "cardmarket"), "tcgplayer");
  assert.equal(cardPriceSortSource("EUR", "tcgplayer"), "cardmarket");
  assert.equal(cardPriceSortCurrencyOf("$price.eur"), "EUR");
  assert.equal(cardPriceSortCurrencyOf("price_usd"), null);
});
