import type { RarityTier } from "@magic-vault/shared";

export type ThemeColor = {
  name: string;
  value: string;
  fg: string;
};

export interface Swatch {
  bg: string;
  textClass: string;
}

export interface RaritySwatch extends Swatch {
  tier: RarityTier | null;
}
