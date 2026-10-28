import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cardFoilTypeOptions,
  cardPriceFor,
  scanFoilType,
  type PlayingCard,
} from "@magic-vault/shared";
import { detectableFoilTypes } from "../src/lib/card-finish-vectors";
import {
  pokemonFinishes,
  pokemonFinishProducts,
  pokemonTcgplayerProductId,
} from "../src/lib/adapters/pokemon/finishes";
import type { PokemonCardDetail } from "../src/lib/interfaces/pokemon";

const riolu: PokemonCardDetail = {
  id: "me02.5-112",
  localId: "112",
  name: "Riolu",
  variants_detailed: [
    { type: "normal", size: "standard", thirdParty: { tcgplayer: 675924 } },
    { type: "reverse", size: "standard", foil: "friendball", thirdParty: { tcgplayer: 676942 } },
    { type: "reverse", size: "standard", foil: "energy", thirdParty: { tcgplayer: 677082 } },
  ],
};

test("patterned reverse holos with their own product become separate finishes", () => {
  assert.deepEqual(
    pokemonFinishes(riolu).map((finish) => finish.foilType),
    ["Reverse Holo (Friend Ball)", "Reverse Holo (Energy Symbol)"],
  );
  const products = pokemonFinishProducts({ tcgplayerId: "675924", raw: riolu } as PlayingCard);
  assert.deepEqual(
    products.map((product) => [product.foilType, product.productId, product.subTypes.at(-1)]),
    [
      ["Reverse Holo (Friend Ball)", 676942, "Normal"],
      ["Reverse Holo (Energy Symbol)", 677082, "Normal"],
    ],
  );
});

test("patterns sharing the main product, stamps and jumbo sizes collapse or drop", () => {
  const aerodactyl: PokemonCardDetail = {
    id: "base3-1",
    localId: "1",
    name: "Aerodactyl",
    pricing: { tcgplayer: { "unlimited-holofoil": { productId: 44418 } } },
    variants_detailed: [
      { type: "holo", size: "standard", foil: "galaxy", thirdParty: { tcgplayer: 44418 } },
      { type: "holo", size: "standard", foil: "galaxy", stamp: ["1st-edition"], thirdParty: { tcgplayer: 44418 } },
      { type: "holo", size: "standard", foil: "cosmos", stamp: ["pre-release"] },
      { type: "holo", size: "jumbo", thirdParty: { tcgplayer: 1 } },
    ],
  };
  assert.equal(pokemonTcgplayerProductId(aerodactyl.pricing), 44418);
  assert.deepEqual(pokemonFinishes(aerodactyl).map((finish) => finish.foilType), ["Holo"]);
});

test("the price follows the card's finish and falls back to the generic foil price", () => {
  const card = {
    price: 0.15,
    priceFoil: 0.245,
    finishPrices: {
      "Reverse Holo (Friend Ball)": { priceFoil: 0.21 },
      "Reverse Holo (Energy Symbol)": { priceFoil: 0.28 },
    },
  } as unknown as PlayingCard;
  assert.equal(cardPriceFor(card, { isFoil: true, foilType: "Reverse Holo (Energy Symbol)" }, "tcgplayer"), 0.28);
  assert.equal(cardPriceFor(card, { isFoil: true, foilType: "Reverse Holo" }, "tcgplayer"), 0.245);
  assert.equal(cardPriceFor(card, true, "tcgplayer"), 0.245);
  assert.equal(cardPriceFor(card, false, "tcgplayer"), 0.15);
});

test("finish options come from the card and keep the current value", () => {
  const card = { foilTypes: ["Reverse Holo (Friend Ball)"] } as PlayingCard;
  assert.deepEqual(cardFoilTypeOptions(["Holo", "Reverse Holo"], card, "Reverse Holo"), [
    "Reverse Holo (Friend Ball)",
    "Reverse Holo",
  ]);
  assert.deepEqual(cardFoilTypeOptions(["Holo"], null, null), ["Holo"]);
});

test("a detected pattern replaces the generic session finish only with a clear margin", () => {
  const card = {
    foilTypes: ["Reverse Holo", "Reverse Holo (Poké Ball)", "Reverse Holo (Master Ball)", "Holo"],
    finishMatches: [
      { foilType: "Reverse Holo", distance: 0.2 },
      { foilType: "Reverse Holo (Poké Ball)", distance: 0.12 },
      { foilType: "Reverse Holo (Master Ball)", distance: 0.18 },
    ],
  } as PlayingCard;
  assert.equal(scanFoilType(card, "Reverse Holo"), "Reverse Holo (Poké Ball)");
  assert.equal(scanFoilType(card, "Reverse Holo (Master Ball)"), "Reverse Holo (Master Ball)");
  assert.equal(scanFoilType(card, "Holo"), "Holo");
  assert.equal(scanFoilType(card, null), null);
  const close = {
    ...card,
    finishMatches: [
      { foilType: "Reverse Holo (Poké Ball)", distance: 0.12 },
      { foilType: "Reverse Holo (Master Ball)", distance: 0.125 },
    ],
  } as PlayingCard;
  assert.equal(scanFoilType(close, "Reverse Holo"), "Reverse Holo");
});

test("a single pattern in the session's family is picked without detection", () => {
  const card = { foilTypes: ["Reverse Holo (Friend Ball)"] } as PlayingCard;
  assert.equal(scanFoilType(card, "Reverse Holo"), "Reverse Holo (Friend Ball)");
  assert.deepEqual(
    [...detectableFoilTypes({ foilTypes: ["Reverse Holo (Friend Ball)", "Reverse Holo (Energy Symbol)", "Holo"] } as PlayingCard)],
    ["Reverse Holo (Friend Ball)", "Reverse Holo (Energy Symbol)"],
  );
});
