import type { Icon } from "@tabler/icons-react";
import type { ComponentType, ReactNode } from "react";
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

export interface HeroScanReadoutProps {
  scannedCard: DemoScannedCard;
}

export interface HeroSortLogProps {
  tick: number;
  sortedCount: number;
}

export interface HeroStationLabelProps {
  step: string;
  label: string;
}

export interface FeatureSpotlightDemoProps {
  isRevealed: boolean;
}

export interface LandingFeatureSpotlight {
  key: string;
  icon: Icon;
  demo: ComponentType<FeatureSpotlightDemoProps>;
  isInteractive?: boolean;
  isFullWidth?: boolean;
  isNew?: boolean;
}

export interface FeatureSpotlightRowProps {
  spotlight: LandingFeatureSpotlight;
  numberLabel: string;
  isMirrored: boolean;
}

export interface FeatureSpotlightStageProps {
  numberLabel: string;
  isInteractive: boolean;
  children: ReactNode;
}

export interface ViewfinderCornersProps {
  className?: string;
}

export interface LandingFeatureListItem {
  key: string;
  icon: Icon;
}

export interface LandingFeatureGroup {
  key: string;
  icon: Icon;
  items: LandingFeatureListItem[];
}

export interface FeatureGroupPanelProps {
  group: LandingFeatureGroup;
  numberLabel: string;
  isRevealed: boolean;
}

export type DemoRuleFieldName = "Rarity" | "Color" | "Type";

export type DemoRuleOperator = "is" | "is not";

export interface DemoRuleField {
  values: string[];
  readCardValues: (card: PlayingCardWithDistance) => string[];
}

export interface DemoRuleCondition {
  field: DemoRuleFieldName;
  operator: DemoRuleOperator;
  value: string;
}

export interface DemoRuleConditionRowProps {
  condition: DemoRuleCondition;
  canRemove: boolean;
  onChange: (condition: DemoRuleCondition) => void;
  onRemove: () => void;
}

export interface DemoStoredCard {
  cardIndex: number;
  isFoil?: boolean;
}

export interface DemoStorageLocation {
  guid: string;
  name: string;
  cardCount: number;
  totalValue: number;
  storedCards: DemoStoredCard[];
}

export interface DemoStorageEntry {
  locationGuid: string;
  locationName: string;
  position: number;
  card: PlayingCardWithDistance;
  isFoil: boolean;
}

export interface DemoStorageTableProps {
  entries: DemoStorageEntry[];
  showsLocation: boolean;
  onOpenLocation: (locationGuid: string) => void;
}

export interface DemoIntakeRow {
  cardIndex: number;
  market: number;
  offer: number;
  declined?: boolean;
}

export interface DemoCountedPriceProps {
  value: number;
  isRevealed: boolean;
  className?: string;
}
