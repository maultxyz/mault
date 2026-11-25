import {
  CARD_COLOR_NAME_HEX,
  CARD_COLOR_SYMBOL_SWATCHES,
  SWATCH_FALLBACK_PALETTE,
} from "./constants/card-colors.constant";
import {
  GAME_RARITY_HEX_COLORS,
  RARITY_ABBREVIATION_MAX_LENGTH,
  RARITY_ABBREVIATION_TIERS,
  RARITY_LABELS,
  RARITY_ORDER,
  RARITY_TIER_HEX_COLORS,
  RARITY_TIER_ORDER,
  RARITY_TIER_PATTERNS,
  RARITY_WORD_ABBREVIATIONS,
} from "./constants/rarity.constant";
import type {
  CardColorSwatch,
  RarityTier,
} from "./interfaces/card-swatches.interface";

export function normalizeSwatchKey(key: string): string {
  return key.trim().toLowerCase().replace(/[_-]+/g, " ");
}

export function fallbackSwatchHex(key: string): string {
  let hash = 0;
  for (const char of normalizeSwatchKey(key)) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return SWATCH_FALLBACK_PALETTE[Math.abs(hash) % SWATCH_FALLBACK_PALETTE.length];
}

export function rarityTier(key: string): RarityTier | null {
  const normalized = normalizeSwatchKey(key);
  return (
    RARITY_ABBREVIATION_TIERS[normalized] ??
    RARITY_TIER_PATTERNS.find(([pattern]) => pattern.test(normalized))?.[1] ??
    null
  );
}

export function gameRarityHexColor(
  key: string,
  gameKey: string | null | undefined,
): string | null {
  if (!gameKey) return null;
  return GAME_RARITY_HEX_COLORS[gameKey]?.[normalizeSwatchKey(key)] ?? null;
}

export function rarityHexColor(key: string, gameKey?: string | null): string {
  const tier = rarityTier(key);
  return (
    gameRarityHexColor(key, gameKey) ??
    (tier ? RARITY_TIER_HEX_COLORS[tier] : fallbackSwatchHex(key))
  );
}

export function rarityLabel(key: string): string {
  return RARITY_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

export function rarityAbbreviation(key: string): string {
  const words = normalizeSwatchKey(key)
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .split(" ")
    .filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1 && words[0].length <= RARITY_ABBREVIATION_MAX_LENGTH) {
    return words[0].toUpperCase();
  }
  return words
    .map((word) => RARITY_WORD_ABBREVIATIONS[word] ?? word.charAt(0).toUpperCase())
    .join("");
}

function rarityTierRank(key: string): number {
  const tier = rarityTier(key);
  return tier ? RARITY_TIER_ORDER.indexOf(tier) : RARITY_TIER_ORDER.length;
}

export function sortRarities<T extends { key: string; count: number }>(
  entries: T[],
): T[] {
  return [...entries].sort((a, b) => {
    const orderA = RARITY_ORDER.indexOf(a.key);
    const orderB = RARITY_ORDER.indexOf(b.key);
    if (orderA !== -1 && orderB !== -1) return orderA - orderB;
    return rarityTierRank(a.key) - rarityTierRank(b.key) || b.count - a.count;
  });
}

export function cardColorSwatch(key: string): CardColorSwatch {
  const symbol = CARD_COLOR_SYMBOL_SWATCHES[key];
  return {
    label: symbol?.label ?? key,
    hex:
      symbol?.hex ??
      CARD_COLOR_NAME_HEX[normalizeSwatchKey(key)] ??
      fallbackSwatchHex(key),
  };
}
