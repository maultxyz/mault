import type { OrgOverviewCard } from "@magic-vault/shared";
import type { IconName } from "@/lib/interfaces/ui";
import type { ValueChange } from "@magic-vault/shared";

export interface HomeHeroStat {
  label: string;
  value: string;
}

export interface HomeHeroProps {
  label: string;
  value: string;
  change: ValueChange | null;
  changeCaption: string;
  stats: HomeHeroStat[];
  sparklineValues: number[];
  onPress?: () => void;
  accessibilityHint?: string;
}


export interface HomeCardRailProps {
  title: string;
  cards: OrgOverviewCard[];
  captionOf: (card: OrgOverviewCard) => string;
  tileWidth?: number;
  action?: { label: string; onPress: () => void };
}

export interface HomeHighlightRowProps {
  icon: IconName;
  tone: "warning" | "success" | "primary";
  title: string;
  description: string;
  actionLabel: string;
  onPress: () => void;
}

export interface HomeActivityFigureProps {
  value: string;
  label: string;
}

export interface HomeTopCardsListProps {
  title: string;
  cards: OrgOverviewCard[];
  priceOf: (card: OrgOverviewCard) => string | undefined;
  action?: { label: string; onPress: () => void };
}
