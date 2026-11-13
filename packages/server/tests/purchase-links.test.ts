import assert from "node:assert/strict";
import { test } from "node:test";
import type { PlayingCard } from "@magic-vault/shared";
import {
  purchaseLinksFor,
  purchaseLinksForProduct,
} from "../src/lib/card-search/purchase-links";
import type { CardSearchAdapter } from "../src/lib/interfaces/card-search";

const card = {
  id: "card-1",
  name: "Black Lotus",
  set: "lea",
  collectorNumber: "232",
} as PlayingCard;

const mtgAdapter = {
  tcgplayer: {
    categoryId: 1,
    subTypes: () => ({ price: [], priceFoil: [] }),
    productIdFromRaw: (c: PlayingCard) => (c.raw as { tcgplayer_id?: number }).tcgplayer_id,
  },
  cardmarket: { gameId: 1, siteGamePath: "Magic" },
  cardkingdom: { scryfallIdFromRaw: () => null },
} as unknown as CardSearchAdapter;

test("purchase links use product pages when the product is known", () => {
  const links = purchaseLinksFor(mtgAdapter, {
    ...card,
    raw: { tcgplayer_id: 1234 },
    cardKingdomPrice: {
      retail: 1,
      buylist: null,
      inStock: 1,
      url: "https://www.cardkingdom.com/mtg/alpha/black-lotus",
    },
  });
  assert.equal(links.tcgplayer, "https://www.tcgplayer.com/product/1234");
  assert.equal(links.cardkingdom, "https://www.cardkingdom.com/mtg/alpha/black-lotus");
  assert.equal(
    links.cardmarket,
    "https://www.cardmarket.com/en/Magic/Products/Search?searchString=Black%20Lotus",
  );
});

const pokemonAdapter = {
  cardmarket: {
    gameId: 6,
    siteGamePath: "Pokemon",
    productIdFromRaw: (c: PlayingCard) =>
      (c.raw as { idProduct?: number }).idProduct,
  },
} as unknown as CardSearchAdapter;

test("the Cardmarket link opens the product, on the card's language site", () => {
  const links = purchaseLinksFor(pokemonAdapter, {
    ...card,
    name: "Cuencia",
    lang: "fr",
    raw: { idProduct: 725309 },
  });
  assert.equal(
    links.cardmarket,
    "https://www.cardmarket.com/fr/Pokemon/Products?idProduct=725309",
  );
});

test("the Cardmarket link searches on the card's language site without a product id", () => {
  const links = purchaseLinksFor(pokemonAdapter, {
    ...card,
    name: "Cuencia",
    lang: "fr",
    raw: {},
  });
  assert.equal(
    links.cardmarket,
    "https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString=Cuencia",
  );
});

test("a language without a Cardmarket site uses the English one", () => {
  const links = purchaseLinksFor(pokemonAdapter, {
    ...card,
    lang: "ja",
    raw: { idProduct: 1 },
  });
  assert.equal(links.cardmarket, "https://www.cardmarket.com/en/Pokemon/Products?idProduct=1");
});

test("purchase links fall back to a name search without raw data", () => {
  const links = purchaseLinksFor(mtgAdapter, card);
  assert.equal(links.tcgplayer, "https://www.tcgplayer.com/search/all/product?q=Black%20Lotus");
  assert.equal(
    links.cardkingdom,
    "https://www.cardkingdom.com/catalog/search?search=header&filter%5Bname%5D=Black%20Lotus",
  );
});

test("purchase links skip marketplaces the game has no listing for", () => {
  const links = purchaseLinksFor({ cardmarket: { gameId: 24 } } as unknown as CardSearchAdapter, card);
  assert.deepEqual(links, {});
});

test("purchase links build from a stored product id and Card Kingdom url", () => {
  const links = purchaseLinksForProduct(mtgAdapter, {
    name: "Black Lotus",
    tcgplayerProductId: 1234,
    cardKingdomUrl: "https://www.cardkingdom.com/mtg/alpha/black-lotus",
  });
  assert.equal(links.tcgplayer, "https://www.tcgplayer.com/product/1234");
  assert.equal(links.cardkingdom, "https://www.cardkingdom.com/mtg/alpha/black-lotus");
  assert.equal(
    links.cardmarket,
    "https://www.cardmarket.com/en/Magic/Products/Search?searchString=Black%20Lotus",
  );
});
