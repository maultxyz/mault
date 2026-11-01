import assert from "node:assert/strict";
import { test } from "node:test";
import { pokemonAdapter } from "../src/lib/adapters/pokemon/search";
import { scryfallAdapter } from "../src/lib/adapters/scryfall/search";
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
