import type { CardPriceChangeSinceScan, OrgOverviewCard, ValueChange } from "@magic-vault/shared";
import type { Icon } from "@tabler/icons-react";

export interface HomeHighlightRowProps {
  icon: Icon;
  tone: "warning" | "success" | "primary";
  title: string;
  description: string;
  to: string;
}

export interface HomeCardRailProps {
  title: string;
  cards: OrgOverviewCard[];
  captionOf: (card: OrgOverviewCard) => string;
  priceChangeOf?: (card: OrgOverviewCard) => CardPriceChangeSinceScan | null;
  tileClassName?: string;
  action?: { label: string; to: string };
  isLoading?: boolean;
  loadingTileCount?: number;
}

export interface HomeValueChange {
  change: ValueChange;
  caption: string;
}
