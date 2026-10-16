import type { ReactNode } from "react";
import type {
  CardStatsAggregate,
  LeaderboardEntry,
  OrgOverviewCard,
  StatsCollectionRow,
  StatsRange,
  StatsReport,
} from "@magic-vault/shared";
import type { STATS_ACTIVITY_METRICS, STATS_COLLECTION_METRICS } from "@/lib/constants/stats";

export type StatsActivityMetric = (typeof STATS_ACTIVITY_METRICS)[number];
export type StatsCollectionMetric = (typeof STATS_COLLECTION_METRICS)[number];

export interface ColumnChartDatum {
  key: string;
  label: string;
  value: number;
}

export interface ColumnChartProps {
  data: ColumnChartDatum[];
  formatValue: (value: number) => string;
  accessibilityLabel: string;
  endLabel?: string;
}

export interface BarListItem {
  key: string;
  label: string;
  value: number;
  display: string;
  secondary?: string;
  swatch?: string;
  onPress?: () => void;
}

export interface BarListProps {
  items: BarListItem[];
}

export interface StatsSectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

export interface StatsDashboardProps {
  report: StatsReport;
  onSelectCollection: (guid: string) => void;
}

export interface StatsActivitySectionProps {
  report: StatsReport;
}

export interface StatsCollectionsSectionProps {
  collections: StatsCollectionRow[];
  onSelectCollection: (guid: string) => void;
}

export interface StatsTopCardsProps {
  cards: OrgOverviewCard[];
}

export interface StatsBreakdownEntry {
  key: string;
  label: string;
  count: number;
  color?: string;
}

export interface StatsBreakdown {
  sets: CardStatsAggregate["sets"];
  rarities: StatsBreakdownEntry[];
  colors: StatsBreakdownEntry[];
  foilTypes: StatsBreakdownEntry[];
}

export interface StatsLeaderboardSheetProps {
  visible: boolean;
  onClose: () => void;
}

export interface LeaderboardRow {
  key: string;
  entry: LeaderboardEntry;
}

export interface StatsControlsProps {
  range: StatsRange;
  onRangeChange: (range: StatsRange) => void;
  collectionGuid: string | null;
  onCollectionChange: (guid: string | null) => void;
}
