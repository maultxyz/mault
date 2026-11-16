import { describe, expect, it } from "vitest";
import {
  catalogSearchGameKey,
  initialCatalogOffsetsByGame,
  nextCatalogOffsetsByGame,
} from "@magic-vault/shared";

const magic = { gameKey: "mtg", gameName: "Magic", lang: "en", collectionGuid: "a" };
const pokemon = { gameKey: "pokemon", gameName: "Pokemon", lang: "en", collectionGuid: "b" };

describe("catalog search paging", () => {
  it("starts every game at the first page", () => {
    expect(initialCatalogOffsetsByGame([magic, pokemon])).toEqual({ "mtg:en": 0, "pokemon:en": 0 });
  });

  it("only asks for more from games that still have results", () => {
    expect(
      nextCatalogOffsetsByGame([
        { gameKey: catalogSearchGameKey(magic), nextOffset: 8 },
        { gameKey: catalogSearchGameKey(pokemon), nextOffset: null },
      ]),
    ).toEqual({ "mtg:en": 8 });
  });

  it("stops paging once every game is exhausted", () => {
    expect(nextCatalogOffsetsByGame([{ gameKey: "mtg:en", nextOffset: null }])).toBeNull();
  });
});
