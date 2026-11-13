import type { ReactNode } from "react";
import type {
  CardStatsAggregate,
  LeaderboardEntry,
  OrgOverviewCard,
  StatsCollectionRow,
  StatsReport,
} from "@magic-vault/shared";
import type { STATS_ACTIVITY_METRICS, STATS_COLLECTION_METRICS } from "@/lib/constants/stats";
import type { IconName } from "@/lib/interfaces/ui";

export type StatsActivityMetric = (typeof STATS_ACTIVITY_METRICS)[number];
export type StatsCollectionMetric = (typeof STATS_COLLECTION_METRICS)[number];

export interface ColumnChartDatum {
  key: string;
  label: string;
  value: number;
  detail?: string;
}

export interface ColumnChartProps {
  data: ColumnChartDatum[];
  formatValue: (value: number) => string;
  accessibilityLabel: string;
  endLabel?: string;
  formatColumnValue?: (value: number) => string;
  columnGap?: number;
  labelEachColumn?: boolean;
}

export interface AreaChartProps {
  data: ColumnChartDatum[];
  formatValue: (value: number) => string;
  formatAxisValue: (value: number) => string;
  accessibilityLabel: string;
  endLabel?: string;
}

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
  formatShare: (value: number, total: number) => string;
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
  collapsedCount?: number;
}

export interface StatsInsight {
  key: string;
  icon: IconName;
  title: string;
  detail: string;
}

export interface StatsHighlightsProps {
  insights: StatsInsight[];
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

export interface StatsTextLineSkeletonProps {
  width: number | `${number}%`;
}

export interface StatsSectionSkeletonProps {
  title: string;
  children: ReactNode;
}
