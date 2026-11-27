import assert from "node:assert/strict";
import { test } from "node:test";
import { fabSyncSource } from "../src/lib/adapters/fab/sync";
import { pokemonSyncSource } from "../src/lib/adapters/pokemon/sync";
import { yugiohSyncSource } from "../src/lib/adapters/yugioh/sync";
import type { SyncSource } from "../src/lib/interfaces/card-search";
import type { CatalogCardRow } from "../src/lib/interfaces/sync-job";
import { sourceDataHashOf } from "../src/lib/sync-job/catalog-row";

function rowWithData(data: unknown): CatalogCardRow {
  return {
    cardId: "card-1",
    gameKey: "test",
    lang: "en",
    name: "Card 1",
    setCode: "set",
    collectorNumber: "1",
    setName: "Set",
    rarity: "rare",
    colorIdentity: [],
    searchText: "card 1",
    imageSmall: null,
    data,
  };
}

function hashOf(source: SyncSource, data: unknown): string {
  return sourceDataHashOf(rowWithData(data), source);
}

function pokemonCard(marketPrice: number, updated: string, productId = 86123) {
  return {
    id: "hgss4-1",
    name: "Aggron",
    pricing: {
      tcgplayer: {
        unit: "USD",
        updated,
        normal: { productId, marketPrice, lowPrice: marketPrice / 2 },
      },
      cardmarket: { idProduct: 277483, trend: marketPrice, updated },
    },
  };
}

test("Pokémon price moves keep the source data hash", () => {
  assert.equal(
    hashOf(pokemonSyncSource, pokemonCard(35, "2026-11-25T00:00:00Z")),
    hashOf(pokemonSyncSource, pokemonCard(41, "2026-11-26T00:00:00Z")),
  );
});

test("Pokémon variant price moves keep the source data hash", () => {
  const withVariant = (marketPrice: number) => ({
    ...pokemonCard(35, "2026-11-25T00:00:00Z"),
    variants_detailed: [
      {
        type: "holo",
        thirdParty: { tcgplayer: 83480 },
        pricing: { tcgplayer: { updated: `${marketPrice}`, holofoil: { productId: 83480, marketPrice } } },
      },
    ],
  });
  assert.equal(hashOf(pokemonSyncSource, withVariant(6)), hashOf(pokemonSyncSource, withVariant(9)));
});

test("Pokémon product id changes still change the source data hash", () => {
  assert.notEqual(
    hashOf(pokemonSyncSource, pokemonCard(35, "2026-11-25T00:00:00Z")),
    hashOf(pokemonSyncSource, pokemonCard(35, "2026-11-25T00:00:00Z", 99999)),
  );
});

test("Pokémon cards without pricing hash their data unchanged", () => {
  assert.notEqual(
    hashOf(pokemonSyncSource, { id: "a", name: "A" }),
    hashOf(pokemonSyncSource, { id: "a", name: "B" }),
  );
});

function yugiohCard(price: string, setPrice: string, setRarity = "Ultra Rare") {
  return {
    id: 46986414,
    name: "Dark Magician",
    card_sets: [{ set_name: "Duel Power", set_code: "DUPO-EN101", set_rarity: setRarity, set_price: setPrice }],
    card_prices: [{ tcgplayer_price: price, cardmarket_price: price }],
  };
}

test("Yu-Gi-Oh price moves keep the source data hash", () => {
  assert.equal(
    hashOf(yugiohSyncSource, yugiohCard("0.33", "3.52")),
    hashOf(yugiohSyncSource, yugiohCard("0.40", "4.10")),
  );
});

test("Yu-Gi-Oh printing changes still change the source data hash", () => {
  assert.notEqual(
    hashOf(yugiohSyncSource, yugiohCard("0.33", "3.52")),
    hashOf(yugiohSyncSource, yugiohCard("0.33", "3.52", "Secret Rare")),
  );
});

function fabCard(marketPrice: number, rarity = "M") {
  return {
    uniqueId: "FM9T9Dg8bj9h9MW7k9HCQ",
    name: "10,000 Year Reunion",
    cardPrintings: [
      {
        uniqueId: "q9B6nmKrdz8HnQnJMpQdc",
        rarity,
        tcgplayerProductId: "551703",
        tcgPlayerPrice: {
          lowPrice: marketPrice,
          midPrice: marketPrice,
          highPrice: marketPrice,
          marketPrice,
          priceLastUpdated: `2026-11-2${Math.round(marketPrice)}T04:33:08Z`,
        },
      },
    ],
  };
}

test("Flesh and Blood price moves keep the source data hash", () => {
  assert.equal(hashOf(fabSyncSource, fabCard(0.46)), hashOf(fabSyncSource, fabCard(5)));
});

test("Flesh and Blood printing changes still change the source data hash", () => {
  assert.notEqual(hashOf(fabSyncSource, fabCard(0.46)), hashOf(fabSyncSource, fabCard(0.46, "R")));
});
