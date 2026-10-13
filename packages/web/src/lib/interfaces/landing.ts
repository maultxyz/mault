import type { Icon } from "@tabler/icons-react";
import type { ComponentType } from "react";
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

export interface LandingSectionHeaderProps {
  eyebrow: string;
  heading: string;
  subtitle: string;
  centered?: boolean;
}

export interface LandingFeatureHighlight {
  key: string;
  icon: Icon;
  demo: ComponentType;
  className: string;
  isNew?: boolean;
}

export interface LandingFeatureExtra {
  key: string;
  icon: Icon;
}

export interface DemoStorageBox {
  name: string;
  cardCount: number;
  value: number;
}

export interface DemoStoredCard {
  position: number;
  card: DemoScannedCard["card"];
}

export interface DemoPickListEntry {
  name: string;
  quantity: number;
  found: number;
}
