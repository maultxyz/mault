import type {
  STATS_ACTIVITY_METRICS,
  STATS_COLLECTION_METRICS,
  STATS_COLLECTION_COST_COLUMNS,
  STATS_COLLECTION_TABLE_COLUMNS,
  STATS_VIEWS,
} from "@/lib/constants/stats";
import type {
  LeaderboardEntry,
  OrgOverviewCard,
  StatsCollectionRow,
  StatsReport,
} from "@magic-vault/shared";

export type StatsActivityMetric = (typeof STATS_ACTIVITY_METRICS)[number];
export type StatsCollectionMetric = (typeof STATS_COLLECTION_METRICS)[number];
export type StatsCollectionColumn =
  | (typeof STATS_COLLECTION_TABLE_COLUMNS)[number]
  | (typeof STATS_COLLECTION_COST_COLUMNS)[number];

export type StatsView = (typeof STATS_VIEWS)[number];

export interface StatsValueSectionProps {
  report: StatsReport;
}

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
}

export interface ColumnChartProps {
  data: ColumnChartDatum[];
  formatValue: (value: number) => string;
  ariaLabel: string;
  endLabel?: string;
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
  costsVisible: boolean;
  onSelectCollection: (guid: string) => void;
}

export interface StatsCollectionsTableProps {
  collections: StatsCollectionRow[];
  costsVisible: boolean;
  onSelectCollection: (guid: string) => void;
  onSetCost: (row: StatsCollectionRow) => void;
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

export interface LeaderboardRow {
  key: string;
  entry: LeaderboardEntry;
}

export interface StatsLeaderboardButtonProps {
  iconOnly?: boolean;
}
