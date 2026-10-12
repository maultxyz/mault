import type { RarityTier, Swatch } from "@/lib/interfaces/colors";

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

export const RARITY_TIER_SWATCHES: Record<RarityTier, Swatch> = {
  secret: { bg: "#E11D48", textClass: "text-white" },
  illustration: { bg: "#DB2777", textClass: "text-white" },
  mythic: { bg: "var(--mythic)", textClass: "text-black" },
  superRare: { bg: "#9333EA", textClass: "text-white" },
  rare: { bg: "var(--rare)", textClass: "text-black" },
  uncommon: { bg: "var(--uncommon)", textClass: "text-black" },
  common: { bg: "var(--common)", textClass: "text-white" },
  promo: { bg: "#0D9488", textClass: "text-white" },
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
