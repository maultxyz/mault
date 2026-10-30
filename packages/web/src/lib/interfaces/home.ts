import type { OrgOverviewCard, OrgOverviewDay } from "@magic-vault/shared";

export interface ScanActivityChartProps {
  days: OrgOverviewDay[];
}

export interface HomeCardStripProps {
  title: string;
  cards: OrgOverviewCard[];
}

export interface MobileHomeOverviewProps {
  orgId: string | undefined;
}

export interface MobileHomeHeroProps {
  orgId: string | undefined;
}
