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

// Rarity swatch colors (index.css) are fixed regardless of light/dark theme,
// so the text color needs to be picked per swatch's own lightness rather
// than tied to the app's theme like text-foreground/text-background would be.
export const RARITY_TEXT_CLASS: Record<string, string> = {
  common: "text-white",
  c: "text-white",
  uncommon: "text-black",
  u: "text-black",
  rare: "text-black",
  r: "text-black",
  mythic: "text-black",
  lr: "text-black",
  p: "text-black",
};
