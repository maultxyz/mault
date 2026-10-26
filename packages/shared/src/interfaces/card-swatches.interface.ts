export type RarityTier =
  | "secret"
  | "illustration"
  | "mythic"
  | "superRare"
  | "rare"
  | "uncommon"
  | "common"
  | "promo";

export interface CardColorSwatch {
  label: string;
  hex: string;
}
