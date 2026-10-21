import type { Icon } from "@tabler/icons-react";
import type { ComponentType } from "react";
import type {
  BusinessPriceInfo,
  PlanConfig,
  PlanSettings,
  PlayingCardWithDistance,
} from "@magic-vault/shared";

export interface PublicPricing {
  business: BusinessPriceInfo | null;
  businessYearly?: BusinessPriceInfo | null;
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

export interface HeroStationLabelProps {
  step: string;
  label: string;
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
