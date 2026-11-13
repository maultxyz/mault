import assert from "node:assert/strict";
import { test } from "node:test";
import type { PlayingCard } from "@magic-vault/shared";
import { pokemonAdapter } from "../src/lib/adapters/pokemon/search";
import { scryfallAdapter } from "../src/lib/adapters/scryfall/search";
import { foilOnlyFoilTypeOf } from "../src/lib/card-search/tcgplayer-prices";
import { tcgplayerFoilTypes } from "../src/lib/tcgplayer-foil-types";

test("TCGplayer foil printings map onto the game's foil types", () => {
  assert.deepEqual(
    tcgplayerFoilTypes(pokemonAdapter.tcgplayer!, [
      "Normal",
      "1st Edition",
      "Unlimited",
      "Holofoil",
      "1st Edition Holofoil",
      "Unlimited Holofoil",
      "Reverse Holofoil",
    ]),
    ["Holo", "Reverse Holo"],
  );
  assert.deepEqual(tcgplayerFoilTypes(scryfallAdapter.tcgplayer!, ["Normal", "Foil"]), [
    "Traditional",
  ]);
  assert.deepEqual(
    tcgplayerFoilTypes({ ...pokemonAdapter.tcgplayer!, foilTypeOfVariant: undefined }, [
      "1st Edition Normal",
      "Rainbow Foil",
      "Cold Foil",
    ]),
    ["Cold Foil", "Rainbow Foil"],
  );
});

test("a card is foil-only only when TCGplayer catalogs no non-foil variant", () => {
  const subTypes = { price: ["Normal"], priceFoil: ["Foil"] };
  assert.equal(foilOnlyFoilTypeOf(scryfallAdapter.tcgplayer!, new Set(["Foil"]), subTypes), "Traditional");
  assert.equal(
    foilOnlyFoilTypeOf(scryfallAdapter.tcgplayer!, new Set(["Normal", "Foil"]), subTypes),
    undefined,
  );
  assert.equal(foilOnlyFoilTypeOf(scryfallAdapter.tcgplayer!, new Set(), subTypes), undefined);
  assert.equal(
    foilOnlyFoilTypeOf(
      pokemonAdapter.tcgplayer!,
      new Set(["Reverse Holofoil"]),
      pokemonAdapter.tcgplayer!.subTypes({} as PlayingCard),
    ),
    "Reverse Holo",
  );
});
