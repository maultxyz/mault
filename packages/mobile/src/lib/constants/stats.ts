export const STATS_ACTIVITY_METRICS = ["count", "value"] as const;
export const STATS_COLLECTION_METRICS = ["totalValue", "cardCount", "scansInRange"] as const;
export const STATS_BAR_LIST_LIMIT = 10;
export const STATS_ALL_COLLECTIONS = "all";
export const STATS_CHART_HEIGHT = 112;
export const STATS_TOP_CARD_COLUMNS = 3;

export const STATS_RARITY_LABELS: Record<string, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  mythic: "Mythic",
  special: "Special",
  bonus: "Bonus",
};

export const STATS_RARITY_ORDER = ["mythic", "rare", "uncommon", "common", "special", "bonus"];

export const STATS_RARITY_TIER_ORDER = [
  "secret",
  "illustration",
  "mythic",
  "superRare",
  "rare",
  "uncommon",
  "common",
  "promo",
] as const;

export const STATS_RARITY_TIER_COLORS: Record<(typeof STATS_RARITY_TIER_ORDER)[number], string> = {
  secret: "#E11D48",
  illustration: "#DB2777",
  mythic: "#F8861C",
  superRare: "#9333EA",
  rare: "#E6CA2F",
  uncommon: "#82BFF1",
  common: "#5A5A5A",
  promo: "#0D9488",
};

export const STATS_RARITY_ABBREVIATIONS: Record<string, (typeof STATS_RARITY_TIER_ORDER)[number]> = {
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

export const STATS_RARITY_PATTERNS: [RegExp, (typeof STATS_RARITY_TIER_ORDER)[number]][] = [
  [
    /secret|hyper|enchanted|iconic|starlight|ghost|ultimate|fabled|prismatic|collector|quarter century|platinum|gold/,
    "secret",
  ],
  [/illustration|special art|alt(ernate)? art|full art|manga/, "illustration"],
  [/mythic|legend/, "mythic"],
  [/super|ultra|double|epic|majestic|marvel|amazing|radiant|shiny|ace spec/, "superRare"],
  [/uncommon/, "uncommon"],
  [/rare|holo/, "rare"],
  [/common/, "common"],
  [/promo|special|bonus|token|basic|land|starter/, "promo"],
];

export const STATS_FALLBACK_PALETTE = [
  "#0EA5E9",
  "#F97316",
  "#10B981",
  "#8B5CF6",
  "#EF4444",
  "#EAB308",
  "#EC4899",
  "#14B8A6",
  "#6366F1",
  "#84CC16",
  "#A16207",
  "#64748B",
];

export const STATS_CARD_COLORS: Record<string, { label: string; color: string }> = {
  W: { label: "White", color: "#F9FAF4" },
  U: { label: "Blue", color: "#0E68AB" },
  B: { label: "Black", color: "#150B00" },
  R: { label: "Red", color: "#D3202A" },
  G: { label: "Green", color: "#00733E" },
  C: { label: "Colorless", color: "#94979A" },
};

export const STATS_COLOR_NAME_COLORS: Record<string, string> = {
  white: "#F9FAF4",
  blue: "#0E68AB",
  black: "#150B00",
  red: "#D3202A",
  green: "#00733E",
  colorless: "#94979A",
  yellow: "#EAB308",
  purple: "#7E22CE",
  orange: "#EA7A1E",
  pink: "#EC4899",
  brown: "#8D6E63",
  gray: "#94979A",
  grey: "#94979A",
  gold: "#C9A227",
  silver: "#B8BEC6",
  multicolor: "#C9A227",
  grass: "#3FA129",
  fire: "#E4572E",
  water: "#2980EF",
  lightning: "#FAC000",
  psychic: "#9B4FB4",
  fighting: "#C0612B",
  darkness: "#2F3A40",
  metal: "#8E9AA6",
  dragon: "#B8A038",
  fairy: "#EF70EF",
  amber: "#F4B223",
  amethyst: "#7C4182",
  emerald: "#2A8934",
  ruby: "#D3082F",
  sapphire: "#0094CF",
  steel: "#9FA8B3",
  vigilance: "#2E6FB5",
  command: "#3E8E41",
  aggression: "#C62828",
  cunning: "#E8B923",
  heroism: "#E9E4D4",
  villainy: "#1B1B1B",
  fury: "#D23A2B",
  calm: "#3D9E5A",
  mind: "#2E6DB4",
  body: "#E07B1E",
  chaos: "#7A3FA0",
  order: "#E8C547",
  wind: "#4CAF50",
  norm: "#B0B0B0",
  arcane: "#6A4C93",
  astra: "#F2C14E",
  umbra: "#3B3355",
  crux: "#B03A2E",
  exia: "#E9E9F0",
  luxem: "#F7D774",
  neos: "#48C9B0",
  tera: "#8D6E63",
  dark: "#4B2E83",
  light: "#F4E285",
  earth: "#8B6B3E",
  divine: "#C9A227",
};
