export type SorceryFinish = "Standard" | "Foil" | "Rainbow";

export interface SorceryEngine {
  type: string;
  category: string;
  rarity: string | null;
  slot: string | null;
  rules: string | null;
  cost: number | null;
  attack: number | null;
  defense: number | null;
  life: number | null;
  water: number | null;
  earth: number | null;
  fire: number | null;
  air: number | null;
  elements: string[];
  subtypes: string[];
  keywords: string[];
  umbrellas: string[];
  back: SorceryEngine | null;
}

export interface SorceryPrintingFace {
  finish: SorceryFinish;
  product: string;
  typeline: string;
  flavor: string | null;
  artist: { name: string; slug: string } | null;
}

export interface SorceryPrinting {
  id: string;
  slug: string;
  printedAt: string;
  set: { name: string; code: string; releasedAt: string };
  meta: SorceryPrintingFace & { back: SorceryPrintingFace | null };
}

export interface SorceryCard {
  id: string;
  name: string;
  slug: string;
  engine: SorceryEngine;
  printings: SorceryPrinting[];
}

export interface SorceryTcgplayerProductName {
  baseName: string;
  variant: string | null;
  isFoil: boolean;
}
