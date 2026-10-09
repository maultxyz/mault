import type {
  STATS_ACTIVITY_METRICS,
  STATS_COLLECTION_METRICS,
  STATS_COLLECTION_TABLE_COLUMNS,
} from "@/lib/constants/stats";
import type {
  OrgOverviewCard,
  StatsCollectionRow,
  StatsReport,
} from "@magic-vault/shared";

export type StatsActivityMetric = (typeof STATS_ACTIVITY_METRICS)[number];
export type StatsCollectionMetric = (typeof STATS_COLLECTION_METRICS)[number];
export type StatsCollectionColumn =
  (typeof STATS_COLLECTION_TABLE_COLUMNS)[number];

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

export interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
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
