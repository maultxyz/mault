import type { CardPriceChangeSinceScan, OrgOverviewCard } from "@magic-vault/shared";
import type { IconName } from "@/lib/interfaces/ui";
import type { ValueChange } from "@magic-vault/shared";

export interface HomeHeroStat {
  label: string;
  value: string;
  exactValue?: string;
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
  priceChangeOf?: (card: OrgOverviewCard) => CardPriceChangeSinceScan | null;
  tileWidth?: number;
  action?: { label: string; onPress: () => void };
  isLoading?: boolean;
  loadingTileCount?: number;
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
  exactValue?: string;
}

export interface HomeTopCardsListProps {
  title: string;
  cards: OrgOverviewCard[];
  priceOf: (card: OrgOverviewCard) => string | undefined;
  action?: { label: string; onPress: () => void };
}
