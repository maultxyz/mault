import type { OrgOverviewCard, ValueChange } from "@magic-vault/shared";
import type { Icon } from "@tabler/icons-react";

export interface HomeQuickAction {
  key: string;
  icon: Icon;
  label: string;
  to?: string;
  onSelect?: () => void;
  isPrimary?: boolean;
}

export interface HomeQuickActionsProps {
  actions: HomeQuickAction[];
}

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
  tileClassName?: string;
  action?: { label: string; to: string };
}

export interface HomeValueChange {
  change: ValueChange;
  caption: string;
}
