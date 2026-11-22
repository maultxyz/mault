import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";
import type { HomeValueChange } from "@/lib/interfaces/home";
import type {
  STATS_ACTIVITY_METRICS,
  STATS_COLLECTION_METRICS,
  STATS_COLLECTION_TABLE_COLUMNS,
} from "@/lib/constants/stats";
import type {
  LeaderboardMetric,
  OrgOverviewCard,
  StatsCollectionRow,
  StatsReport,
} from "@magic-vault/shared";

export type StatsActivityMetric = (typeof STATS_ACTIVITY_METRICS)[number];
export type StatsCollectionMetric = (typeof STATS_COLLECTION_METRICS)[number];
export type StatsCollectionColumn = (typeof STATS_COLLECTION_TABLE_COLUMNS)[number];


export interface StatsCollectionSort {
  column: StatsCollectionColumn;
  desc: boolean;
}

export interface BarListRowProps {
  item: BarListItem;
  max: number;
}

export interface ColumnChartDatum {
  key: string;
  label: string;
  value: number;
  detail?: string;
}

export interface ColumnChartProps {
  data: ColumnChartDatum[];
  formatValue: (value: number) => string;
  formatColumnValue?: (value: number) => string;
  ariaLabel: string;
  endLabel?: string;
  labelEachColumn?: boolean;
}

export interface AreaChartProps {
  data: ColumnChartDatum[];
  formatValue: (value: number) => string;
  formatAxisValue: (value: number) => string;
  ariaLabel: string;
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

export interface ValueHeroStat {
  label: string;
  value: ReactNode;
}

export interface ValueHeroProps {
  label: string;
  value: ReactNode;
  stats: ValueHeroStat[];
  sparklineValues: number[];
  change?: HomeValueChange | null;
}

export interface StatsInsight {
  key: string;
  icon: Icon;
  title: string;
  detail: string;
  to?: string;
}

export interface StatsSplitEntry {
  key: string;
  label: string;
  count: number;
  bg: string;
}

export interface StatsHighlightsProps {
  insights: StatsInsight[];
  heading?: string;
}

export interface BarListItem {
  key: string;
  label: string;
  value: number;
  display: string;
  secondary?: string;
  swatch?: string;
  onSelect?: () => void;
}

export interface BarListProps {
  items: BarListItem[];
  emptyLabel?: string;
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

export interface StatsCollectionsTableProps {
  collections: StatsCollectionRow[];
  onSelectCollection: (guid: string) => void;
}

export interface StatsTopCardsProps {
  cards: OrgOverviewCard[];
}

export interface StatsControlsProps {
  collectionGuid: string | null;
  onCollectionChange: (guid: string | null) => void;
  range: StatsReport["range"];
  onRangeChange: (range: StatsReport["range"]) => void;
}

export type { LeaderboardRow } from "@magic-vault/shared";

export interface StatsLeaderboardButtonProps {
  iconOnly?: boolean;
}

export interface StatsLeaderboardContentProps {
  metric: LeaderboardMetric;
  onMetricChange: (metric: LeaderboardMetric) => void;
}
