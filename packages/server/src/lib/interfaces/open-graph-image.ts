import type { OpenGraphStat } from "@magic-vault/shared";

export type OpenGraphImageVisual =
  | { kind: "sorterPhoto" }
  | { kind: "cards"; cardImageUrls: string[] }
  | { kind: "shopPhoto"; orgId: string; fallbackCardImageUrls: string[] };

export interface OpenGraphImageContent {
  eyebrow: string;
  headline: string;
  subtitle: string;
  stats: readonly OpenGraphStat[];
  visual: OpenGraphImageVisual;
  alt: string;
}

export interface OpenGraphTextBlock {
  lines: string[];
  fontSize: number;
}

export interface OpenGraphThemePalette {
  background: string;
  foreground: string;
  secondaryText: string;
  eyebrow: string;
  emptyVisual: string;
  cardShadowOpacity: number;
}
