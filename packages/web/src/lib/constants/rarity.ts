import type { Swatch } from "@/lib/interfaces/colors";
import type { RarityTier } from "@magic-vault/shared";

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
