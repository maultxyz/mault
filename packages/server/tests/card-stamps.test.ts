import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cardPriceFor,
  detectCardStampRgba,
  FIRST_EDITION_STAMP,
  STAMP_TEMPLATES,
  type PlayingCard,
  type RgbaImage,
} from "@magic-vault/shared";
import {
  pokemonStampProducts,
  pokemonStamps,
} from "../src/lib/adapters/pokemon/stamps";
import type { PokemonCardDetail } from "../src/lib/interfaces/pokemon";

const WIDTH = 448;
const HEIGHT = 626;

function syntheticCard(withStamp: boolean): RgbaImage {
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const offset = (y * WIDTH + x) * 4;
      const value = 200 + ((x * 7 + y * 3) % 30);
      data[offset] = value;
      data[offset + 1] = value - 20;
      data[offset + 2] = value - 60;
      data[offset + 3] = 255;
    }
  }
  if (withStamp) {
    const [template] = STAMP_TEMPLATES;
    const { region, values } = template;
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const column = Math.floor(((x / WIDTH - region.x) / region.width) * region.gridWidth);
        const row = Math.floor(((y / HEIGHT - region.y) / region.height) * region.gridHeight);
        if (column < 0 || row < 0 || column >= region.gridWidth || row >= region.gridHeight) {
          continue;
        }
        const value = values[row * region.gridWidth + column];
        const offset = (y * WIDTH + x) * 4;
        data[offset] = value;
        data[offset + 1] = value;
        data[offset + 2] = value;
      }
    }
  }
  return { width: WIDTH, height: HEIGHT, data };
}

const firstEditionCard = { stamps: [FIRST_EDITION_STAMP, "Staff"] };

test("a 1st Edition stamp is detected where the card has a 1st Edition variant", () => {
  const detection = detectCardStampRgba(syntheticCard(true), firstEditionCard);
  assert.equal(detection?.stamp, FIRST_EDITION_STAMP);
  assert.equal(detection?.isStampDetected, true);
});

test("an unstamped card is not reported as 1st Edition", () => {
  const detection = detectCardStampRgba(syntheticCard(false), firstEditionCard);
  assert.equal(detection?.isStampDetected, false);
});

test("stamps are only looked for on cards that have a variant with them", () => {
  assert.equal(detectCardStampRgba(syntheticCard(true), { stamps: ["Staff"] }), null);
  assert.equal(detectCardStampRgba(syntheticCard(true), {}), null);
  assert.equal(detectCardStampRgba(syntheticCard(true), null), null);
});

test("a stamped copy is priced from its stamp on TCGplayer and from the regular printing elsewhere", () => {
  const card = {
    id: "base1-4",
    name: "Charizard",
    price: 300,
    priceFoil: 400,
    priceEur: 250,
    stampPrices: { [FIRST_EDITION_STAMP]: { price: 9000, priceFoil: 12000 } },
  } as unknown as PlayingCard;
  assert.equal(cardPriceFor(card, { isFoil: true, stamp: FIRST_EDITION_STAMP }, "tcgplayer"), 12000);
  assert.equal(cardPriceFor(card, { isFoil: false, stamp: FIRST_EDITION_STAMP }, "tcgplayer"), 9000);
  assert.equal(cardPriceFor(card, { isFoil: true, stamp: "Staff" }, "tcgplayer"), 400);
  assert.equal(cardPriceFor(card, { isFoil: false, stamp: FIRST_EDITION_STAMP }, "cardmarket"), 250);
});

test("Pokémon stamped variants become labelled stamps priced from their own products", () => {
  const raw = {
    variants_detailed: [
      { type: "holo", thirdParty: { tcgplayer: 42382 } },
      { type: "holo", stamp: ["1st-edition"], thirdParty: { tcgplayer: 106999 } },
      { type: "normal", stamp: ["set-logo", "staff"], thirdParty: { tcgplayer: 555 } },
      { type: "normal", stamp: ["pre-release"], size: "jumbo", thirdParty: { tcgplayer: 777 } },
    ],
  } as unknown as PokemonCardDetail;
  assert.deepEqual(pokemonStamps(raw), ["1st Edition", "Set Logo + Staff"]);
  assert.deepEqual(pokemonStampProducts(raw), [
    { stamp: "1st Edition", isFoil: true, productId: 106999, subTypes: ["1st Edition Holofoil"] },
    { stamp: "Set Logo + Staff", isFoil: false, productId: 555, subTypes: ["Normal"] },
  ]);
});
