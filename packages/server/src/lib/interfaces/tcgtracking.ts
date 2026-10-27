import type { PlayingCard } from "@magic-vault/shared";

export interface TcgtrackingSet {
  id: number;
  name: string;
  abbreviation: string | null;
  product_count: number;
}

export interface TcgtrackingProduct {
  id: number;
  name: string;
  number: string | null;
  rarity: string | null;
  ext_data: Record<string, unknown> | null;
  image_url: string | null;
  scryfall_id?: string | null;
}

export interface TcgtrackingCatalogSet {
  id: number;
  name: string;
  abbreviation: string | null;
}

export interface TcgtrackingCatalogEntry {
  product: TcgtrackingProduct;
  set: TcgtrackingCatalogSet;
}

export interface TcgtrackingFallbackData {
  source: "tcgtracking";
  product: TcgtrackingProduct;
  set: TcgtrackingCatalogSet;
  primarySetCode?: string;
  supersededByCardId?: string;
}

export type TcgtrackingNumbering = "global" | "per-set" | "name-only";

export interface TcgtrackingGameConfig {
  numbering: TcgtrackingNumbering;
  numberKeyOf?(card: PlayingCard): string | null;
  isBasePrinting?(card: PlayingCard): boolean;
  primaryCardIdOf?(product: TcgtrackingProduct): string | null;
  colorIdentityOf?(colors: string[]): string[];
}

export interface TcgtrackingPrimaryCard {
  id: string;
  card: PlayingCard;
  numberKey: string | null;
  nameKey: string;
  baseNameKey: string;
}
