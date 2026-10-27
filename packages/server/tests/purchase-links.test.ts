import assert from "node:assert/strict";
import { test } from "node:test";
import type { PlayingCard } from "@magic-vault/shared";
import { purchaseLinksFor } from "../src/lib/card-search/purchase-links";
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
