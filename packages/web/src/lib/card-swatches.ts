import { RARITY_TIER_SWATCHES } from "@/lib/constants/rarity";
import type { RaritySwatch, Swatch } from "@/lib/interfaces/colors";
import {
  cardColorSwatch,
  fallbackSwatchHex,
  gameRarityHexColor,
  rarityTier,
} from "@magic-vault/shared";

function textClassFor(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [value >> 16, (value >> 8) & 0xff, value & 0xff].map(
    (channel) => {
      const c = channel / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    },
  );
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05)
    ? "text-black"
    : "text-white";
}

export function raritySwatch(
  key: string,
  gameKey?: string | null,
): RaritySwatch {
  const tier = rarityTier(key);
  const gameHex = gameRarityHexColor(key, gameKey);
  if (gameHex) return { tier, bg: gameHex, textClass: textClassFor(gameHex) };
  if (tier) return { tier, ...RARITY_TIER_SWATCHES[tier] };
  const bg = fallbackSwatchHex(key);
  return { tier: null, bg, textClass: textClassFor(bg) };
}

export function colorSwatch(key: string): Swatch & { label: string } {
  const { label, hex } = cardColorSwatch(key);
  return { label, bg: hex, textClass: textClassFor(hex) };
}
