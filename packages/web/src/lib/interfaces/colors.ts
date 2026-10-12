export type ThemeColor = {
  name: string;
  value: string;
  fg: string;
};

export type RarityTier =
  | "secret"
  | "illustration"
  | "mythic"
  | "superRare"
  | "rare"
  | "uncommon"
  | "common"
  | "promo";

export interface Swatch {
  bg: string;
  textClass: string;
}

export interface RaritySwatch extends Swatch {
  tier: RarityTier | null;
}
