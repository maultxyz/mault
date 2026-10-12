import {
  CARD_COLOR_NAME_SWATCHES,
  CARD_COLOR_SWATCHES,
  SWATCH_FALLBACK_PALETTE,
} from "@/lib/constants/colors";
import {
  RARITY_ABBREVIATION_TIERS,
  RARITY_TIER_PATTERNS,
  RARITY_TIER_SWATCHES,
} from "@/lib/constants/rarity";
import type { RaritySwatch, RarityTier, Swatch } from "@/lib/interfaces/colors";

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[_-]+/g, " ");
}

function textClassFor(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [value >> 16, (value >> 8) & 0xff, value & 0xff].map(
    (channel) => {
      const c = channel / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    },
  );
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? "text-black" : "text-white";
}

function fallbackSwatch(key: string): Swatch {
  let hash = 0;
  for (const char of normalizeKey(key)) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  const bg =
    SWATCH_FALLBACK_PALETTE[Math.abs(hash) % SWATCH_FALLBACK_PALETTE.length];
  return { bg, textClass: textClassFor(bg) };
}

export function rarityTier(key: string): RarityTier | null {
  const normalized = normalizeKey(key);
  const abbreviated = RARITY_ABBREVIATION_TIERS[normalized];
  if (abbreviated) return abbreviated;
  return (
    RARITY_TIER_PATTERNS.find(([pattern]) => pattern.test(normalized))?.[1] ??
    null
  );
}

export function raritySwatch(key: string): RaritySwatch {
  const tier = rarityTier(key);
  return tier
    ? { tier, ...RARITY_TIER_SWATCHES[tier] }
    : { tier: null, ...fallbackSwatch(key) };
}

export function colorSwatch(key: string): Swatch & { label: string } {
  const known = CARD_COLOR_SWATCHES[key];
  const bg = known?.bg ?? CARD_COLOR_NAME_SWATCHES[normalizeKey(key)];
  if (bg) {
    return { label: known?.label ?? key, bg, textClass: textClassFor(bg) };
  }
  return { label: key, ...fallbackSwatch(key) };
}
