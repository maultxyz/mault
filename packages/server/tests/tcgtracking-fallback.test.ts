import assert from "node:assert/strict";
import { test } from "node:test";
import type { PlayingCard } from "@magic-vault/shared";
import { gundamAdapter } from "../src/lib/adapters/gundam/search";
import { onePieceAdapter } from "../src/lib/adapters/onepiece/search";
import { pokemonAdapter } from "../src/lib/adapters/pokemon/search";
import { riftboundAdapter } from "../src/lib/adapters/riftbound/search";
import { withTcgtracking } from "../src/lib/tcgtracking/adapter";
import {
  normalizeTcgtrackingFallback,
  toTcgtrackingFallbackData,
} from "../src/lib/tcgtracking/fallback";
import { TCGTRACKING_GAMES } from "../src/lib/tcgtracking/games";
import {
  baseCardNameKey,
  cardNameKey,
  collectorNumberKey,
  comparableProductName,
} from "../src/lib/tcgtracking/keys";
import type { CardSearchAdapter } from "../src/lib/interfaces/card-search";
import type {
  TcgtrackingCatalogEntry,
  TcgtrackingFallbackData,
  TcgtrackingPrimarySet,
} from "../src/lib/interfaces/tcgtracking";

function fallback(ext: Record<string, unknown>): TcgtrackingFallbackData {
  return {
    source: "tcgtracking",
    product: {
      id: 712889,
      name: "Loki (Alternate Art)",
      number: "OP17-119",
      rarity: "Secret Rare",
      ext_data: ext,
      image_url: null,
    },
    tcgtrackingSet: { id: 24833, name: "The Dominance of God", abbreviation: "OP18" },
  };
}

function storedFallback(
  gameKey: string,
  adapter: CardSearchAdapter,
  entry: TcgtrackingCatalogEntry,
  primarySet?: TcgtrackingPrimarySet,
) {
  const data = toTcgtrackingFallbackData(entry, primarySet, TCGTRACKING_GAMES[gameKey]);
  const card = withTcgtracking(gameKey, adapter).normalizeStored(
    JSON.parse(JSON.stringify(data)),
    `tcgp-${entry.product.id}`,
    "en",
  );
  assert.ok(card);
  return { data, card };
}

test("collector numbers drop the set total and leading zeros", () => {
  assert.equal(collectorNumberKey("050/185"), "50");
  assert.equal(collectorNumberKey("014"), "14");
  assert.equal(collectorNumberKey("op01-016"), "OP01-016");
});

test("names compare without punctuation, case or variant suffixes", () => {
  assert.equal(
    cardNameKey("Hera Syndulla -  Renegade General"),
    cardNameKey("Hera Syndulla, Renegade General"),
  );
  assert.equal(baseCardNameKey("Nami (Parallel)"), "nami");
});

test("product names drop the appended number and Pokémon's basic energy prefix", () => {
  const product = (name: string, number: string) => ({
    id: 713248,
    name,
    number,
    rarity: null,
    ext_data: {},
    image_url: null,
  });
  assert.equal(
    cardNameKey(
      comparableProductName(
        TCGTRACKING_GAMES.pokemon,
        product("Basic Grass Energy - 001", "1"),
      ),
    ),
    cardNameKey("Grass Energy"),
  );
  assert.equal(
    baseCardNameKey(
      comparableProductName(
        TCGTRACKING_GAMES.pokemon,
        product("Basic Grass Energy - 009 (30th Celebration)", "009"),
      ),
    ),
    "grass energy",
  );
  assert.equal(
    comparableProductName(
      TCGTRACKING_GAMES.pokemon,
      product("Ledyba - 1/15", "001/015"),
    ),
    "Ledyba",
  );
  assert.equal(
    comparableProductName(
      TCGTRACKING_GAMES.lorcana,
      product("Mickey Mouse - Brave Little Tailor", "115"),
    ),
    "Mickey Mouse - Brave Little Tailor",
  );
  assert.equal(
    comparableProductName(
      TCGTRACKING_GAMES.lorcana,
      product("Basic Fire Energy", "2"),
    ),
    "Basic Fire Energy",
  );
});

test("fallback cards read the older capitalized ext_data shape", () => {
  const card = normalizeTcgtrackingFallback(
    fallback({
      CardType: "Character",
      Subtypes: "FILM",
      Color: "Purple",
      Cost: "8",
      Power: "8000",
      Description: "[On Play] <em>DON!! -2</em>",
    }),
    "tcgp-712889",
    TCGTRACKING_GAMES.onepiece,
  );
  assert.equal(card.typeLine, "Character \u2014 FILM");
  assert.deepEqual(card.colorIdentity, ["Purple"]);
  assert.equal(card.cmc, 8);
  assert.equal(card.text, "[On Play] DON!! -2");
  assert.equal(card.tcgplayerId, "712889");
  assert.equal(card.set, "OP18");
});

test("fallback cards read the newer array ext_data shape", () => {
  const card = normalizeTcgtrackingFallback(
    fallback({
      cardType: ["Character"],
      subtypes: ["Giant", "Elbaph"],
      color: ["Black"],
      cost: "6",
      power: "8000",
    }),
    "tcgp-712889",
    TCGTRACKING_GAMES.onepiece,
  );
  assert.equal(card.typeLine, "Character \u2014 Giant Elbaph");
  assert.deepEqual(card.colorIdentity, ["Black"]);
  assert.equal(card.cmc, 6);
});

test("mtg fallback colors become color letters and keep the full type", () => {
  const card = normalizeTcgtrackingFallback(
    {
      ...fallback({
        color: ["White", "Blue"],
        fullType: "Artifact Creature \u2014 Borg",
      }),
      primarySetCode: "trk",
    },
    "tcgp-725419",
    TCGTRACKING_GAMES.mtg,
  );
  assert.deepEqual(card.colorIdentity, ["W", "U"]);
  assert.equal(card.typeLine, "Artifact Creature \u2014 Borg");
  assert.equal(card.set, "trk");
});

test("fallback cards price on Cardmarket by id, never through the adapter's raw name hook", () => {
  const adapter = withTcgtracking("onepiece", {
    tcgplayer: { categoryId: 68 },
    cardmarket: {
      gameId: 18,
      productNames: (card: PlayingCard) => [
        (card.raw as { card_name: string }).card_name.trim(),
      ],
    },
  } as unknown as CardSearchAdapter);
  const data = fallback({});
  const card = normalizeTcgtrackingFallback(
    { ...data, product: { ...data.product, cardmarket_id: 834211 } },
    "tcgp-712889",
    TCGTRACKING_GAMES.onepiece,
  );
  assert.equal(adapter.cardmarket?.productIdFromRaw?.(card), 834211);
  assert.deepEqual(adapter.cardmarket?.productNames?.(card), []);
});

test("fallback data carries the primary source's name and number keys so field sorts match", () => {
  const data = toTcgtrackingFallbackData(
    {
      product: {
        id: 713248,
        name: "Ledyba",
        number: "001/015",
        rarity: null,
        ext_data: {},
        image_url: null,
      },
      set: { id: 24000, name: "Mega Evolution", abbreviation: "MEG" },
    },
    undefined,
    TCGTRACKING_GAMES.pokemon,
  );
  assert.equal(data.localId, "001");
  assert.equal(data.name, "Ledyba");
  assert.equal(data.source, "tcgtracking");
  assert.equal(
    normalizeTcgtrackingFallback(data, "tcgp-713248", TCGTRACKING_GAMES.pokemon)
      .collectorNumber,
    "001",
  );
});

test("pokemon fallbacks store TCGdex fields and normalize like TCGdex cards", () => {
  const { data, card } = storedFallback(
    "pokemon",
    pokemonAdapter,
    {
      product: {
        id: 241693,
        name: "Tapu Fini",
        number: "040/198",
        rarity: "Holo Rare",
        ext_data: {
          Artist: "Shin Nagasawa",
          "Attack 1":
            "[W] Smash Turn (30)\r\n<br>You may switch this Pokemon with 1 of your Benched Pokemon.",
          "Attack 2":
            "[1WW] Ocean Loop (120)\r\n<br>Put an Energy attached to this Pokemon into your hand.",
          "Card Type / HP / Stage": "Water / 120 / Stage 1",
          "Weakness / Resistance / Retreat Cost": "Lx2 / None / 1",
        },
        image_url: null,
      },
      set: { id: 2807, name: "SWSH06: Chilling Reign", abbreviation: "SWSH06" },
    },
    { code: "swsh6", name: "Chilling Reign" },
  );
  assert.deepEqual(data.types, ["Water"]);
  assert.equal(data.hp, 120);
  assert.equal(data.stage, "Stage1");
  assert.equal(data.retreat, 1);
  assert.equal(data.category, "Pokemon");
  assert.equal(data.illustrator, "Shin Nagasawa");
  assert.deepEqual(data.set, { id: "swsh6", name: "Chilling Reign" });
  assert.deepEqual(data.attacks, [
    {
      cost: ["Water"],
      name: "Smash Turn",
      damage: 30,
      effect: "You may switch this Pokemon with 1 of your Benched Pokemon.",
    },
    {
      cost: ["Colorless", "Water", "Water"],
      name: "Ocean Loop",
      damage: 120,
      effect: "Put an Energy attached to this Pokemon into your hand.",
    },
  ]);
  assert.equal(card.id, "tcgp-241693");
  assert.equal(card.set, "swsh6");
  assert.equal(card.setName, "Chilling Reign");
  assert.equal(card.rarity, "holo rare");
  assert.equal(card.typeLine, "Pokemon - Stage1");
  assert.deepEqual(card.colorIdentity, ["Water"]);
  assert.equal(card.tcgplayerId, "241693");
  assert.equal(card.isFallbackData, true);
  assert.equal(card.price, null);
});

test("pokemon trainer and energy fallbacks get TCGdex categories and unprefixed set names", () => {
  const entry = (typeHpStage: string): TcgtrackingCatalogEntry => ({
    product: {
      id: 1,
      name: "Card",
      number: "1",
      rarity: "Uncommon",
      ext_data: { "Card Type / HP / Stage": typeHpStage, "Card Text": "Draw 3 cards." },
      image_url: null,
    },
    set: { id: 2, name: "SV10: Destined Rivals", abbreviation: "SV10" },
  });
  const supporter = storedFallback(
    "pokemon",
    pokemonAdapter,
    entry("Trainer - Supporter /  / "),
  ).data;
  assert.equal(supporter.category, "Trainer");
  assert.equal(supporter.trainerType, "Supporter");
  assert.equal(supporter.effect, "Draw 3 cards.");
  assert.equal(supporter.stage, undefined);
  assert.deepEqual(supporter.set, { id: "SV10", name: "Destined Rivals" });
  const energy = storedFallback("pokemon", pokemonAdapter, entry("Basic Energy /  / ")).data;
  assert.equal(energy.category, "Energy");
  assert.equal(energy.energyType, "Normal");
});

test("one piece fallbacks store OPTCG fields and normalize like OPTCG cards", () => {
  const { data, card } = storedFallback("onepiece", onePieceAdapter, {
    product: {
      id: 723148,
      name: "Nami (061) (Alternate Art)",
      number: "EB05-061",
      rarity: "Secret Rare",
      ext_data: {
        cost: "3",
        life: null,
        color: ["Red", "Green"],
        power: "4000",
        number: "EB05-061",
        counter: "2000",
        cardType: ["Character"],
        subtypes: ["Straw Hat Crew"],
        attribute: ["Special"],
        description: "[On Play] Play up to 1 red Character card.",
        rarityDbName: "SEC",
      },
      image_url: null,
    },
    set: {
      id: 24820,
      name: "Extra Booster: One Piece Heroines Edition Vol. 2",
      abbreviation: "EB05",
    },
  });
  assert.equal(data.card_name, "Nami (061) (Alternate Art)");
  assert.equal(data.set_id, "EB-05");
  assert.equal(data.set_name, "Extra Booster: One Piece Heroines Edition Vol. 2");
  assert.equal(data.rarity, "SEC");
  assert.equal(data.card_color, "Red Green");
  assert.equal(data.card_type, "Character");
  assert.equal(data.sub_types, "Straw Hat Crew");
  assert.equal(data.attribute, "Special");
  assert.equal(data.card_cost, "3");
  assert.equal(data.card_power, "4000");
  assert.equal(data.counter_amount, 2000);
  assert.equal(data.card_text, "[On Play] Play up to 1 red Character card.");
  assert.equal(card.set, "EB05");
  assert.equal(card.rarity, "SEC");
  assert.deepEqual(card.colorIdentity, ["Red", "Green"]);
  assert.equal(card.typeLine, "Character — Straw Hat Crew");
  assert.equal(card.cmc, 3);
});

test("one piece fallbacks without a rarity code or counter use OPTCG's code and zero counter", () => {
  const { data } = storedFallback("onepiece", onePieceAdapter, {
    product: {
      id: 1,
      name: "Monkey.D.Luffy",
      number: "P-120",
      rarity: "Promo",
      ext_data: { cardType: ["Character"], counter: null },
      image_url: null,
    },
    set: { id: 2, name: "One Piece Promotion Cards", abbreviation: "OP-PR" },
  });
  assert.equal(data.rarity, "PR");
  assert.equal(data.counter_amount, 0);
});

test("gundam fallbacks store Gundam GCG fields and normalize like Gundam GCG cards", () => {
  const entry = (rarity: string): TcgtrackingCatalogEntry => ({
    product: {
      id: 727925,
      name: "Gundam GP02A (LR+)",
      number: "GD06-049",
      rarity,
      ext_data: {
        cost: "4",
        zone: "Earth;Space",
        color: ["Purple"],
        level: "5",
        trait: "(Zeon) (Delaz Fleet)",
        number: "GD06-049",
        cardType: ["Unit"],
        hitPoints: "3",
        description: "[When Paired] Destroy every enemy player's Base.<br>\n[Destroyed] Draw 1.",
        sourceTitle: "Mobile Suit Gundam 0083: Stardust Memory",
        attackPoints: "4",
        rarityDbName: rarity,
        linkCondition: "[Anavel Gato]",
      },
      image_url: null,
    },
    set: { id: 24804, name: "Stardust Trails", abbreviation: "GD06" },
  });
  const { data, card } = storedFallback("gundam", gundamAdapter, entry("LR+"));
  assert.equal(data.rarity, "LR +");
  assert.equal(data.card_type, "UNIT");
  assert.equal(data.color, "Purple");
  assert.equal(data.zone, "Space Earth");
  assert.equal(data.cost, 4);
  assert.equal(data.level, 5);
  assert.equal(data.ap, 4);
  assert.equal(data.hp, 3);
  assert.equal(data.set_code, "GD06");
  assert.equal(data.set_name, "Stardust Trails");
  assert.deepEqual(data.traits, ["Zeon", "Delaz Fleet"]);
  assert.deepEqual(data.link_refs, ["Anavel Gato"]);
  assert.equal(data.keywords_text, "when paired destroyed");
  assert.equal(
    data.effect,
    "[When Paired] Destroy every enemy player's Base.\n[Destroyed] Draw 1.",
  );
  assert.equal(card.rarity, "lr +");
  assert.equal(card.typeLine, "UNIT");
  assert.deepEqual(card.colorIdentity, ["Purple"]);
  assert.equal(card.power, "4");
  assert.equal(card.toughness, "3");
  assert.equal(card.collectorNumber, "049");
  assert.equal(storedFallback("gundam", gundamAdapter, entry("UC")).data.rarity, "U");
});

test("riftbound fallbacks store Riftbound fields and normalize like Riftbound cards", () => {
  const { data, card } = storedFallback(
    "riftbound",
    riftboundAdapter,
    {
      product: {
        id: 723425,
        name: "Graves, Blasting Through",
        number: "123/167",
        rarity: "Rare",
        ext_data: {
          tag: "Bilgewater;Graves",
          might: "4",
          domain: "Body;Chaos",
          cardType: ["Champion Unit"],
          powerCost: "1",
          energyCost: "5",
          description: "[Tank] <em>(I must be assigned combat damage first.)</em>",
        },
        image_url: null,
      },
      set: { id: 24819, name: "Radiance", abbreviation: "RAD" },
    },
    { code: "RAD", name: "Radiance" },
  );
  assert.deepEqual(data.classification, {
    type: "Unit",
    supertype: "Champion",
    rarity: "Rare",
    domain: ["Body", "Chaos"],
  });
  assert.deepEqual(data.attributes, { might: 4, power: 1, energy: 5 });
  assert.deepEqual(data.tags, ["Bilgewater", "Graves"]);
  assert.deepEqual(data.set, { label: "Radiance", set_id: "RAD" });
  assert.equal(data.collector_number, 123);
  assert.equal(card.rarity, "rare");
  assert.equal(card.typeLine, "Unit - Champion");
  assert.deepEqual(card.colorIdentity, ["Body", "Chaos"]);
  assert.equal(card.text, "[Tank] (I must be assigned combat damage first.)");
  assert.equal(card.cmc, 5);
});

test("riftbound battlefields and runes match the primary domain and supertype", () => {
  const entry = (ext: Record<string, unknown>): TcgtrackingCatalogEntry => ({
    product: {
      id: 1,
      name: "Card",
      number: "1/2",
      rarity: "Common",
      ext_data: ext,
      image_url: null,
    },
    set: { id: 2, name: "Origins", abbreviation: "OGN" },
  });
  const battlefield = storedFallback(
    "riftbound",
    riftboundAdapter,
    entry({ "Card Type": "Battlefield", Domain: "None" }),
  ).data;
  assert.deepEqual(battlefield.classification, {
    type: "Battlefield",
    supertype: null,
    rarity: "Common",
    domain: ["Colorless"],
  });
  const rune = storedFallback(
    "riftbound",
    riftboundAdapter,
    entry({ "Card Type": "Rune", Domain: "Fury" }),
  ).data;
  assert.equal((rune.classification as { supertype: string }).supertype, "Basic");
});

test("legacy fallback rows with the TCGTracking set under set still normalize from ext data", () => {
  const { tcgtrackingSet, ...data } = fallback({ cardType: ["Character"], color: ["Black"] });
  const card = withTcgtracking("onepiece", onePieceAdapter).normalizeStored(
    { ...data, set: tcgtrackingSet, card_name: "Loki" },
    "tcgp-712889",
    "en",
  );
  assert.equal(card?.set, "OP18");
  assert.equal(card?.setName, "The Dominance of God");
  assert.deepEqual(card?.colorIdentity, ["Black"]);
});
