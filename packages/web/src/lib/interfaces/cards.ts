import type {
  CardFilters,
  FieldMeta,
  GroupedScannedCard,
  PlayingCard,
  PlayingCardWithDistance,
  ScannedCard,
} from "@magic-vault/shared";
import type { ReactElement, ReactNode } from "react";

export interface CardSearchPickerProps {
  collectionGuid: string | undefined;
  initialQuery?: string;
  disabled?: boolean;
  onSelect: (card: PlayingCard) => void;
}

export interface CardSortButtonProps {
  sortKey: string | null;
  onSortChange: (key: string | null) => void;
  sortableFields: FieldMeta[];
  className?: string;
}

export interface CardDetailsListProps {
  card: PlayingCard;
}

export interface DetailSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export interface CardPriceDetailsProps {
  card: PlayingCard;
  isFoil?: boolean;
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
  highlightColumn: number;
  format: (value: number) => string;
}

export interface PriceHeadlineProps {
  label: string;
  price: number | null;
  foilPrice: number | null;
  isFoil: boolean;
  format: (value: number) => string;
}


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

export type CardGridDensity = "compact" | "comfortable" | "large";

export interface CardToolbarProps {
  leading?: ReactNode;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortKey: string | null;
  onSortChange: (key: string | null) => void;
  sortableFields: FieldMeta[];
  onExport?: () => void;
  onStartReview?: () => void;
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
  density?: CardGridDensity;
  onDensityChange?: (density: CardGridDensity) => void;
  groupDuplicates: boolean;
  onGroupDuplicatesChange: (grouped: boolean) => void;
}

export interface ScannedCardItemProps {
  card: PlayingCardWithDistance;
  scannedAt?: number;

  onOpen: () => void;
  binNumber?: number;
  isSelected?: boolean;
  onToggleSelect?: (options: SelectToggleOptions) => void;
  hasAlternatives?: boolean;
  needsReview?: boolean;
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
  needsReview?: boolean;
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

export interface CardTechnicalDetailsProps {
  scanId: string;
  card: PlayingCardWithDistance;
  needsReview?: boolean;
  wasCorrected?: boolean;
}

export interface TechnicalDetailRowProps {
  label: string;
  children: ReactNode;
}

export interface CardContextMenuProps {
  entry: GroupedScannedCard;
  isSelected: boolean;
  onOpen: () => void;
  onToggleSelect: () => void;
  children: ReactNode;
}

export interface ClearCardQueryButtonProps {
  searchQuery: string;
  activeFilterCount: number;
  onClear: () => void;
}

export interface SessionSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: ScannedCard[];
  elapsedMs: number;
  sessionScanCount: number;
  collectionName: string;
  onMarkDownloaded: (scanIds: string[]) => void;
  gridFilters: CardFilters;
  gridFilterCount: number;
}

export type WrappedStorySlide = Exclude<WrappedSlide, { type: "outro" }>;

export type WrappedSlide =
  | { key: string; type: "intro" }
  | { key: string; type: "total"; count: number }
  | { key: string; type: "unique"; uniqueCount: number; totalCount: number }
  | { key: string; type: "set"; name: string; count: number }
  | {
      key: string;
      type: "rarity";
      rarities: { key: string; label: string; count: number }[];
      total: number;
    }
  | {
      key: string;
      type: "color";
      label: string;
      bg: string;
      count: number;
      total: number;
    }
  | { key: string; type: "mvp"; name: string; price: number }
  | { key: string; type: "value"; totalValue: number; avgValue: number }
  | {
      key: string;
      type: "speed";
      cardsPerHour: number | null;
      elapsedMs: number;
    }
  | { key: string; type: "outro" };

export interface CardFiltersContextValue {
  filters: CardFilters;
  setFilters: (filters: CardFilters) => void;
  toggleRarity: (rarity: string) => void;
  toggleColor: (color: string) => void;
  toggleSet: (setCode: string) => void;
}

export interface CapturedImageThumbProps {
  src: string;
  alt: string;
  showOcrRegions?: boolean;
}

export interface CardDetailPanelProps {
  scanId?: string;
  onClose: () => void;
  onRemove?: () => void;
  currentCard?: PlayingCardWithDistance;
  alternativeMatches?: PlayingCardWithDistance[];
  needsReview?: boolean;
  wasCorrected?: boolean;
  isFoil?: boolean;
  foilType?: string;
  binNumber?: number;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  total?: number;
  copyIndex?: number;
  copyCount?: number;
  reviewMode?: boolean;
  onReviewComplete?: () => void;
}

export interface CardFilterPopoverProps {
  activeFilters: CardFilters;
  onFiltersChange: (filters: CardFilters) => void;
  activeFilterCount: number;
  availableRarities: { key: string; label: string }[];
  availableColors: { key: string; label: string; bg: string }[];
  availableFoilTypes: { key: string; label: string }[];
  binCount?: number;
}

export type GridNavigationKey =
  | "ArrowLeft"
  | "ArrowRight"
  | "ArrowUp"
  | "ArrowDown";

export interface CardResultKeyboardNavOptions {
  onSelect: (index: number, options: CardCorrectionOptions) => void;
  onCancel: () => void;
}

export interface CardCorrectionOptions {
  stay: boolean;
}
