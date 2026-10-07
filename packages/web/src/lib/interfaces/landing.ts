import type {
  PlanConfig,
  PlanSettings,
  PlayingCardWithDistance,
} from "@magic-vault/shared";

export interface PublicPricing {
  business: { amount: number; currency: string; interval: string } | null;
  plans?: PlanConfig;
  maxConnectedSorters?: number;
}

export interface PlanBulletsProps {
  settings: PlanSettings;
  maxConnectedSorters: number;
  emphasized?: boolean;
}

export interface DemoScannedCard {
  card: PlayingCardWithDistance;
  binNumber: number;
  isFoil?: boolean;
}

export interface DemoCollection {
  guid: string;
  name: string;
  game: string;
  lang: string;
  cardCount: number;
}

export interface LandingSectionHeaderProps {
  eyebrow: string;
  heading: string;
  subtitle: string;
  centered?: boolean;
}
