import type { RarityTier } from "../interfaces/card-swatches.interface";

export const RARITY_LABELS: Record<string, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  mythic: "Mythic",
  special: "Special",
  bonus: "Bonus",
};

export const RARITY_ORDER = [
  "mythic",
  "rare",
  "uncommon",
  "common",
  "special",
  "bonus",
];

export const RARITY_TIER_ORDER: RarityTier[] = [
  "secret",
  "illustration",
  "mythic",
  "superRare",
  "rare",
  "uncommon",
  "common",
  "promo",
];

export const RARITY_TIER_HEX_COLORS: Record<RarityTier, string> = {
  secret: "#E11D48",
  illustration: "#DB2777",
  mythic: "#F8861C",
  superRare: "#9333EA",
  rare: "#E6CA2F",
  uncommon: "#82BFF1",
  common: "#5A5A5A",
  promo: "#0D9488",
};

export const RARITY_ABBREVIATION_TIERS: Record<string, RarityTier> = {
  c: "common",
  u: "uncommon",
  uc: "uncommon",
  r: "rare",
  s: "superRare",
  sr: "superRare",
  ur: "superRare",
  m: "mythic",
  mr: "mythic",
  l: "mythic",
  lr: "mythic",
  lgd: "mythic",
  sec: "secret",
  scr: "secret",
  f: "secret",
  p: "promo",
  pr: "promo",
  sp: "promo",
  t: "promo",
};

export const RARITY_TIER_PATTERNS: [RegExp, RarityTier][] = [
  [
    /secret|hyper|enchanted|iconic|starlight|ghost|ultimate|fabled|prismatic|collector|quarter century|platinum|gold/,
    "secret",
  ],
  [/illustration|special art|alt(ernate)? art|full art|manga/, "illustration"],
  [/mythic|legend/, "mythic"],
  [
    /super|ultra|double|epic|majestic|marvel|amazing|radiant|shiny|ace spec/,
    "superRare",
  ],
  [/uncommon/, "uncommon"],
  [/rare|holo/, "rare"],
  [/common/, "common"],
  [/promo|special|bonus|token|basic|land|starter/, "promo"],
];
