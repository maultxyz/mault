import type { CardCondition } from "@magic-vault/shared";

export const TCGTRACKING_FALLBACK_ID_PREFIX = "tcgp-";
export const TCGTRACKING_FALLBACK_SOURCE = "tcgtracking";
export const TCGTRACKING_REQUEST_DELAY_MS = 150;
export const TCGTRACKING_CATALOG_TTL_MS = 6 * 60 * 60 * 1000;
export const TCGTRACKING_IMAGE_WIDTH_NORMAL = "1000w";
export const TCGTRACKING_IMAGE_WIDTH_SMALL = "400w";
export const TCGTRACKING_SET_ALIGNMENT_MIN_SHARED = 3;
export const TCGTRACKING_SET_ALIGNMENT_MIN_FRACTION = 0.3;
export const TCGTRACKING_NEW_SET_WINDOW_MS = 180 * 24 * 60 * 60 * 1000;
export const TCGTRACKING_TYPE_LINE_SEPARATOR = " \u2014 ";
export const TCGTRACKING_MTG_COLOR_LETTERS: Record<string, string> = {
  White: "W",
  Blue: "U",
  Black: "B",
  Red: "R",
  Green: "G",
};
export const TCGTRACKING_EXT_KEYS = {
  fullType: ["fullType"],
  type: ["cardType", "CardType", "Card Type"],
  subtypes: ["subtypes", "Subtypes", "Card SubType", "cardSubtype"],
  text: ["description", "Description"],
  power: ["power", "Power", "attackPoints", "attack", "Might"],
  toughness: ["toughness", "hitPoints", "hp", "defense"],
  cost: ["convertedCost", "cost", "Cost", "Energy Cost"],
  color: ["color", "Color", "aspect", "Domain", "element"],
  number: ["number", "Number"],
  rarityCode: ["rarityDbName", "Rarity"],
  artist: ["artist", "Artist"],
  flavorText: ["flavorText", "Flavor Text"],
  gundamLevel: ["level", "Level"],
  gundamTrait: ["trait", "Trait"],
  gundamZone: ["zone", "Zone"],
  gundamLink: ["linkCondition", "Link Condition"],
  gundamSourceTitle: ["sourceTitle", "Source Title"],
  gundamAttackPoints: ["attackPoints", "Attack Points"],
  gundamHitPoints: ["hitPoints", "Hit Points"],
  onePieceAttribute: ["attribute", "Attribute"],
  onePieceCounter: ["counter", "Counterplus", "Counter"],
  onePieceLife: ["life", "Life"],
  riftboundDomain: ["domain", "Domain"],
  riftboundTag: ["tag", "Tag"],
  riftboundMight: ["might", "Might"],
  riftboundPowerCost: ["powerCost", "Power Cost"],
  riftboundEnergyCost: ["energyCost", "Energy Cost"],
  pokemonTypeHpStage: ["Card Type / HP / Stage"],
  pokemonWeaknessResistanceRetreat: ["Weakness / Resistance / Retreat Cost"],
  pokemonCardText: ["Card Text", "description", "Description"],
  pokemonStage: ["stage", "Stage"],
  pokemonHp: ["hp", "HP"],
  pokemonRetreatCost: ["retreatCost", "Retreat Cost"],
  pokemonEnergyType: ["energyType", "Energy Type"],
  pokemonAttacks: [
    ["Attack 1", "attack1"],
    ["Attack 2", "attack2"],
    ["Attack 3", "attack3"],
    ["Attack 4", "attack4"],
  ],
} as const;

export const TCGTRACKING_PRINTED_SET_PREFIX_PATTERN = /^[A-Za-z0-9.&-]+:\s+/;
export const TCGTRACKING_BRACKETED_TAG_PATTERN = /\[([^\]]+)\]/g;
export const TCGTRACKING_ENCLOSED_NAME_PATTERN = /[[(]([^\])]+)[\])]/g;

export const GUNDAM_ZONE_ORDER = ["Space", "Earth"];
export const GUNDAM_EMPTY_FIELD = "-";
export const GUNDAM_RARITY_ALIASES: Record<string, string> = {
  UC: "U",
  Common: "C",
  Uncommon: "U",
  Rare: "R",
  LegendRare: "LR",
  Promo: "P",
};

export const ONE_PIECE_RARITY_CODES: Record<string, string> = {
  Common: "C",
  Uncommon: "UC",
  Rare: "R",
  "Super Rare": "SR",
  "Secret Rare": "SEC",
  "Treasure Rare": "TR",
  Leader: "L",
  Promo: "PR",
};
export const ONE_PIECE_CHARACTER_TYPE = "Character";

export const RIFTBOUND_SUPERTYPES = new Set(["Champion", "Signature", "Token", "Basic"]);
export const RIFTBOUND_RUNE_TYPE = "Rune";
export const RIFTBOUND_RUNE_SUPERTYPE = "Basic";
export const RIFTBOUND_DOMAIN_ALIASES: Record<string, string> = { None: "Colorless" };

export const POKEMON_CATEGORY = {
  pokemon: "Pokemon",
  trainer: "Trainer",
  energy: "Energy",
} as const;
export const POKEMON_ENERGY_TYPES = new Set([
  "Grass",
  "Fire",
  "Water",
  "Lightning",
  "Psychic",
  "Fighting",
  "Darkness",
  "Metal",
  "Fairy",
  "Dragon",
  "Colorless",
]);
export const POKEMON_ENERGY_LETTERS: Record<string, string> = {
  G: "Grass",
  R: "Fire",
  W: "Water",
  L: "Lightning",
  P: "Psychic",
  F: "Fighting",
  D: "Darkness",
  M: "Metal",
  Y: "Fairy",
  N: "Dragon",
  C: "Colorless",
};
export const POKEMON_STAGES: Record<string, string> = {
  basic: "Basic",
  "stage 1": "Stage1",
  "1": "Stage1",
  "stage 2": "Stage2",
  "2": "Stage2",
  break: "BREAK",
  "break evolution": "BREAK",
  "level up": "LEVEL-UP",
  "lv.x": "LEVEL-UP",
  vmax: "VMAX",
  vstar: "VSTAR",
  "v-union": "V-UNION",
  mega: "MEGA",
  restored: "RESTORED",
  baby: "Baby",
};
export const POKEMON_TRAINER_TYPES: Record<string, string> = {
  supporter: "Supporter",
  item: "Item",
  stadium: "Stadium",
  tool: "Tool",
  "pokemon tool": "Tool",
  "pok\u00e9mon tool": "Tool",
  "technical machine": "Technical Machine",
  "rocket's secret machine": "Rocket's Secret Machine",
};
export const POKEMON_TRAINER_PREFIX_PATTERN = /^Trainer\s*-\s*/i;
export const POKEMON_ENERGY_TYPE = { basic: "Normal", special: "Special" } as const;
export const POKEMON_ATTACK_HEADER_PATTERN = /^\[([^\]]*)\]\s*(.*?)(?:\s*\(([^)]*)\))?$/;
export const POKEMON_ABILITY_HEADER_PATTERN = /^(.+?)\s*(?:\u2014|:)\s*(.+)$/;

export const TCGTRACKING_PRODUCT_NUMBER_SUFFIX_PATTERN =
  /\s+-\s+[A-Za-z]*\d+[A-Za-z]?(?:\/\d+)?(?=\s*(?:\(|$))/;

export const GUNDAM_PRODUCT_CARD_NUMBER_TAG_PATTERN = /\s*\([A-Z]+\d*-\d+\)/g;

export const POKEMON_BASIC_ENERGY_PREFIX_PATTERN = /^Basic\s+(?=.*\bEnergy\b)/i;

export const TCGPLAYER_SKU_UPSERT_BATCH_SIZE = 1000;
export const TCGTRACKING_PROGRESS_LOG_EVERY_SETS = 50;
export const TCGPLAYER_SKU_CONDITION_COLUMNS = {
  NM: "nearMintSkuId",
  LP: "lightlyPlayedSkuId",
  MP: "moderatelyPlayedSkuId",
  HP: "heavilyPlayedSkuId",
  DMG: "damagedSkuId",
} as const satisfies Record<CardCondition, string>;
export const TCGPLAYER_SKU_CONDITION_PRICE_COLUMNS = {
  NM: "nearMintMarketPrice",
  LP: "lightlyPlayedMarketPrice",
  MP: "moderatelyPlayedMarketPrice",
  HP: "heavilyPlayedMarketPrice",
  DMG: "damagedMarketPrice",
} as const satisfies Record<CardCondition, string>;
export const TCGTRACKING_SKU_LANGUAGE_CODES: Record<string, string> = {
  ja: "JP",
  zhs: "CS",
  zht: "CT",
};

export const TCGPLAYER_FOIL_VARIANT_PATTERN = /foil/i;

export const TCGPLAYER_EDITION_VARIANT_PREFIX_PATTERN = /^(1st Edition|Unlimited) /;
