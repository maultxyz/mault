import type {
  CardFilters,
  FieldMeta,
  PlayingCard,
  PlayingCardWithDistance,
} from "@magic-vault/shared";
import type { ReactElement, ReactNode } from "react";

export interface DetailSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export interface CardPriceDetailsProps {
  card: PlayingCard;
  className?: string;
}

export interface CardSearchState {
  results: PlayingCard[];
  loading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
}

export interface CardImageViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  capturedImageUrl: string;
  showOcrRegions: boolean;
  onShowOcrRegionsChange: (show: boolean) => void;
}

export interface PriceTableRow {
  label: string;
  values: (number | null)[];
}

export interface PriceTableProps {
  heading: string;
  columns: string[];
  rows: PriceTableRow[];
  printings: number;
  format: (value: number) => string;
}

export type { CardFilters, GroupedScannedCard } from "@magic-vault/shared";

export interface CardSelectDialogProps {
  trigger?: ReactElement;
  title?: string;
  description?: string;
  scanId?: string;
  onRemove?: () => void;
  currentCard?: PlayingCardWithDistance;
  alternativeMatches?: PlayingCardWithDistance[];
  capturedImageUrl?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export type CardViewMode = "grid" | "list";

export interface CardToolbarProps {
  leading?: ReactNode;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortKey: string | null;
  onSortChange: (key: string | null) => void;
  sortableFields: FieldMeta[];
  onExport?: () => void;
  collectionName?: string;
  onClearAll?: () => void;
  hasCards: boolean;
  cardCount: number;
  activeFilters: CardFilters;
  onFiltersChange: (filters: CardFilters) => void;
  activeFilterCount: number;
  watchers?: { userId: string; displayName: string }[];
  allSelected?: boolean;
  onToggleSelectAll?: () => void;
  availableRarities?: { key: string; label: string }[];
  availableColors?: { key: string; label: string; bg: string }[];
  availableFoilTypes?: { key: string; label: string }[];
  binCount?: number;
  viewMode: CardViewMode;
  onViewModeChange: (mode: CardViewMode) => void;
  groupDuplicates: boolean;
  onGroupDuplicatesChange: (grouped: boolean) => void;
}

export interface ScannedCardItemProps {
  card: PlayingCardWithDistance;
  onOpen: () => void;
  binNumber?: number;
  isSelected?: boolean;
  onToggleSelect?: (options: SelectToggleOptions) => void;
  hasAlternatives?: boolean;
  wasCorrected?: boolean;
  isFoil?: boolean;
  foilType?: string;
  isDownloaded?: boolean;
  quantity?: number;
  showBinLocation?: boolean;
}

export interface ScannedCardTableRow {
  scanId: string;
  scanIds: string[];
  card: PlayingCardWithDistance;
  binNumber?: number;
  quantity: number;
  isFoil?: boolean;
  foilType?: string;
  isDownloaded?: boolean;
  hasAlternatives?: boolean;
  wasCorrected?: boolean;
  isSelected?: boolean;
}

export interface ScannedCardTableProps {
  rows: ScannedCardTableRow[];
  showQuantity?: boolean;
  showBinLocation?: boolean;
  onOpen?: (row: ScannedCardTableRow) => void;
  onToggleSelect?: (
    row: ScannedCardTableRow,
    options: SelectToggleOptions,
  ) => void;
  onTogglePageSelect?: () => void;
}

export interface ExportContext {
  isMtg: boolean;
  fieldDefinitions: FieldMeta[];
}

export interface GroupedEntry {
  card: PlayingCardWithDistance;
  quantity: number;
  isFoil: boolean;
  foilType?: string;
}

export type GroupBy = "card" | "card-foil";

export interface ExportAdapter {
  key: string;
  label: string;
  filenameSlug: string;
  groupBy: GroupBy;
  games: "all" | string[];
  headers: (ctx: ExportContext) => string[];
  row: (entry: GroupedEntry, ctx: ExportContext) => string[];
}

export interface SelectToggleOptions {
  shiftKey: boolean;
}
