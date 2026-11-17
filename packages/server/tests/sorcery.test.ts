import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeSorceryCard, sorceryAdapter } from "../src/lib/adapters/sorcery/search";
import { splitSorceryArtworks } from "../src/lib/adapters/sorcery/sync";
import {
  parseSorceryTcgplayerProductName,
  sorceryFoilProducts,
  sorceryPrimaryArtworkKey,
  sorceryProductArtworkKey,
} from "../src/lib/adapters/sorcery/tcgplayer-products";
import type { SorceryCard, SorceryFinish, SorceryPrinting } from "../src/lib/interfaces/sorcery";
import type { TcgtrackingProduct } from "../src/lib/interfaces/tcgtracking";

function printing(slug: string, finish: SorceryFinish, product = "Booster"): SorceryPrinting {
  const [setCode] = slug.split("-");
  return {
    id: `id-${slug}`,
    slug,
    printedAt: "2024-10-04T07:00:00.000Z",
    set: { name: setCode === "001" ? "Alpha" : "Beta", code: setCode, releasedAt: "2024-10-04T07:00:00.000Z" },
    meta: {
      finish,
      product,
      typeline: "A Unique collection of priceless Relics",
      flavor: null,
      artist: { name: "Jeff A. Menges", slug: "jeff_a_menges" },
      back: null,
    },
  };
}

function card(printings: SorceryPrinting[]): SorceryCard {
  return {
    id: "card-id",
    name: "Avatar of Air",
    slug: "avatar_of_air",
    engine: {
      type: "Minion",
      category: "Spell",
      rarity: "Elite",
      slot: "Elite",
      rules: "Airborne",
      cost: 4,
      attack: 3,
      defense: 3,
      life: null,
      water: 0,
      earth: 0,
      fire: 0,
      air: 2,
      elements: ["Air"],
      subtypes: ["Spirit"],
      keywords: ["Airborne"],
      umbrellas: [],
      back: null,
    },
    printings,
  };
}

function product(id: number, name: string): TcgtrackingProduct {
  return { id, name, number: null, rarity: "Elite", ext_data: {}, image_url: null };
}

test("sorcery printings split into one card per artwork with its finishes", () => {
  const artworks = splitSorceryArtworks(
    card([
      printing("001-avatar_of_air-b-f", "Foil"),
      printing("001-avatar_of_air-b-s", "Standard"),
      printing("002-avatar_of_air-b-s", "Standard"),
      printing("001-avatar_of_air-pd-s", "Standard", "PreconstructedDeck"),
    ]),
  );
  assert.deepEqual(
    artworks.map((artwork) => artwork.printings.map((candidate) => candidate.slug)),
    [
      ["001-avatar_of_air-b-s", "001-avatar_of_air-b-f"],
      ["002-avatar_of_air-b-s"],
      ["001-avatar_of_air-pd-s"],
    ],
  );
});

test("sorcery cards normalize engine stats, elements and finishes", () => {
  const normalized = normalizeSorceryCard(
    card([printing("001-avatar_of_air-b-s", "Standard"), printing("001-avatar_of_air-b-f", "Foil")]),
  );
  assert.equal(normalized.id, "001-avatar_of_air-b");
  assert.equal(normalized.set, "001");
  assert.equal(normalized.setName, "Alpha");
  assert.equal(normalized.rarity, "elite");
  assert.equal(normalized.typeLine, "Minion - Spirit");
  assert.equal(normalized.power, "3");
  assert.equal(normalized.toughness, "3");
  assert.equal(normalized.cmc, 4);
  assert.deepEqual(normalized.colorIdentity, ["Air"]);
  assert.equal(normalized.artist, "Jeff A. Menges");
  assert.deepEqual(normalized.foilTypes, ["Foil"]);
  assert.equal(normalized.foilOnlyFoilType, undefined);
});

test("foil-only and rainbow sorcery printings report their foil type", () => {
  const foilOnly = normalizeSorceryCard(card([printing("001-avatar_of_air-b-f", "Foil")]));
  assert.equal(foilOnly.foilOnlyFoilType, "Foil");
  const rainbow = normalizeSorceryCard(card([printing("999-avatar_of_air-op-rf", "Rainbow")]));
  assert.deepEqual(rainbow.foilTypes, ["Rainbow Foil"]);
});

test("tcgplayer product names split into base name, product variant and foil", () => {
  assert.deepEqual(parseSorceryTcgplayerProductName("Avatar of Air (Preconstructed Deck)"), {
    baseName: "Avatar of Air",
    variant: "Preconstructed Deck",
    isFoil: false,
  });
  assert.deepEqual(
    parseSorceryTcgplayerProductName("Sorcerer (Store Alternate Art Promo) (Foil)"),
    { baseName: "Sorcerer", variant: "Store Alternate Art Promo", isFoil: true },
  );
});

test("sorcery products link by name and product, with the foil product as a finish", () => {
  const regular = product(1, "13 Treasures of Britain");
  const foil = product(2, "13 Treasures of Britain (Foil)");
  const precon = product(3, "Avatar of Air (Preconstructed Deck)");
  const foilOnly = product(4, "Avatar of Air (Foil)");
  const unknownVariant = product(5, "Foot Soldier (Forest)");
  const setProducts = [regular, foil, precon, foilOnly, unknownVariant];

  assert.equal(sorceryProductArtworkKey(regular, setProducts), "13 treasures of britain|Booster");
  assert.equal(sorceryProductArtworkKey(foil, setProducts), null);
  assert.equal(sorceryProductArtworkKey(precon, setProducts), "avatar of air|PreconstructedDeck");
  assert.equal(sorceryProductArtworkKey(foilOnly, setProducts), "avatar of air|Booster");
  assert.equal(sorceryProductArtworkKey(unknownVariant, setProducts), null);
  assert.deepEqual(sorceryFoilProducts(regular, setProducts), [{ foilType: "Foil", productId: 2 }]);
  assert.deepEqual(sorceryFoilProducts(foilOnly, setProducts), []);
  assert.equal(
    sorceryPrimaryArtworkKey(card([printing("001-avatar_of_air-b-f", "Foil")])),
    "avatar of air|Booster",
  );
});

test("sorcery foil prices come from the linked foil product", () => {
  const normalized = normalizeSorceryCard(card([printing("001-avatar_of_air-b-s", "Standard")]));
  const finishProducts = sorceryAdapter.tcgplayer?.finishProducts?.({
    ...normalized,
    raw: { ...(normalized.raw as object), tcgtrackingFinishProducts: [{ foilType: "Foil", productId: 2 }] },
  });
  assert.deepEqual(finishProducts, [{ foilType: "Foil", productId: 2, subTypes: ["Foil"] }]);
});
