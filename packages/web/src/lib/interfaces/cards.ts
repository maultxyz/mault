import type {
  CardCondition,
  CardFilters,
  CardStorageLocation,
  CardSetOption,
  Collection,
  FieldMeta,
  GroupedScannedCard,
  OcrRegion,
  PlayingCard,
  PlayingCardWithDistance,
  PriceSource,
  ScannedCard,
} from "@magic-vault/shared";
import type { ReactNode } from "react";
import type { ScanStats } from "@/lib/interfaces/scanner";

export interface CardSearchPickerProps {
  collectionGuid: string | undefined;
  initialQuery?: string;
  disabled?: boolean;
  onSelect: (card: PlayingCard) => void;
}

export interface CardSortOptionsProps {
  sortKey: string | null;
  onSortChange: (key: string | null) => void;
  sortableFields: FieldMeta[];
}

export interface CardDetailsListProps {
  card: PlayingCard;
}

export interface CardScanOriginSectionProps {
  scanId: string;
  collectionGuid: string | undefined;
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
  sets: CardSetOption[];
  totalCount: number;
  loading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
}

export type GameCardSearchState = Pick<
  CardSearchState,
  "results" | "loading" | "hasMore" | "isLoadingMore" | "loadMore"
>;

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

export interface PriceSourceSection {
  source: PriceSource;
  headline: Omit<PriceHeadlineProps, "isFoil">;
  table: PriceTableProps;
}

export type CardViewMode = "grid" | "list";

export type CardGridDensity = "compact" | "comfortable" | "large";

export interface AddCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionGuid?: string;
  locationGuid?: string;
}

export interface AddManualCardInput {
  collectionGuid: string;
  card: PlayingCard;
  locationGuid?: string;
}

export interface CardToolbarProps {
  leading?: ReactNode;
  onAddCard?: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortKey: string | null;
  onSortChange: (key: string | null) => void;
  sortableFields: FieldMeta[];
  onExport?: () => void;
  onStartReview?: () => void;
  needsReviewCount?: number;
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
  availableRarities?: ScanStats["rarities"];
  availableColors?: ScanStats["colors"];
  availableFoilTypes?: { key: string; label: string }[];
  binCount?: number;
  viewMode: CardViewMode;
  onViewModeChange: (mode: CardViewMode) => void;
  density?: CardGridDensity;
  onDensityChange?: (density: CardGridDensity) => void;
  groupDuplicates: boolean;
  onGroupDuplicatesChange: (grouped: boolean) => void;
}

export interface StorageDeleteWarningProps {
  storedCount: number;
  total: number;
  location?: CardStorageLocation;
  className?: string;
}

export interface ExportedCardsDialogProps {
  open: boolean;
  count: number;
  isMoving: boolean;
  onOpenChange: (open: boolean) => void;
  onMove: (locationGuid: string) => Promise<boolean>;
  onDelete: () => void;
}

export interface StorageLocationBadgeProps {
  location: CardStorageLocation;
  className?: string;
}

export interface ReviewStatusIconProps {
  hasAlternatives?: boolean;
  lowConfidenceMatch?: boolean;
  wasCorrected?: boolean;
  isReviewed?: boolean;
  className?: string;
}

export interface ScannedCardItemProps {
  card: PlayingCardWithDistance;
  scannedAt?: number;

  onOpen: () => void;
  binNumber?: number;
  isSelected?: boolean;
  onToggleSelect?: (options: SelectToggleOptions) => void;
  hasAlternatives?: boolean;
  lowConfidenceMatch?: boolean;
  wasCorrected?: boolean;
  isReviewed?: boolean;
  isFoil?: boolean;
  foilType?: string;
  condition?: CardCondition;
  isDownloaded?: boolean;
  quantity?: number;
  showBinLocation?: boolean;
  storageLocation?: CardStorageLocation;
}

export interface ScannedCardTableRow {
  scanId: string;
  scanIds: string[];
  card: PlayingCardWithDistance;
  binNumber?: number;
  quantity: number;
  isFoil?: boolean;
  foilType?: string;
  condition?: CardCondition;
  isDownloaded?: boolean;
  hasAlternatives?: boolean;
  lowConfidenceMatch?: boolean;
  wasCorrected?: boolean;
  isReviewed?: boolean;
  storageLocation?: CardStorageLocation;
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

export interface SelectToggleOptions {
  shiftKey: boolean;
}

export interface CardTechnicalDetailsProps {
  scanId: string;
  card: PlayingCardWithDistance;
  lowConfidenceMatch?: boolean;
  wasCorrected?: boolean;
  isReviewed?: boolean;
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
  className?: string;
}

export interface SessionSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: ScannedCard[];
  elapsedMs: number;
  sessionScanCount: number;
  collectionName: string;
  onExported: (scanIds: string[]) => void;
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
      rarities: ScanStats["rarities"];
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
}

export interface OcrRegionOverlayProps {
  showLabels?: boolean;
  regions?: OcrRegion[];
}

export interface OcrRegionCropsProps {
  src: string;
  className?: string;
}

export interface CardDetailActions {
  correctCard: (scanId: string, card: PlayingCard) => void;
  confirmCard: (scanId: string) => void;
  markCardReviewed: (scanId: string) => void;
  setCardFoilType: (scanId: string, foilType: string | null) => void;
  setCardCondition: (scanId: string, condition: CardCondition) => void;
}

export interface ScanDraftOptions {
  scanId?: string;
  savedFoilType: string | null;
  savedCondition: CardCondition;
  setCardFoilType: CardDetailActions["setCardFoilType"];
  setCardCondition: CardDetailActions["setCardCondition"];
}

export interface CardDetailScope {
  collection: Collection | null;
  actions?: CardDetailActions;
}

export interface CardDetailPanelProps {
  scanId?: string;
  onClose: () => void;
  onRemove?: () => void;
  currentCard?: PlayingCardWithDistance;
  alternativeMatches?: PlayingCardWithDistance[];
  lowConfidenceMatch?: boolean;
  wasCorrected?: boolean;
  isReviewed?: boolean;
  isFoil?: boolean;
  foilType?: string;
  condition?: CardCondition;
  binNumber?: number;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  total?: number;
  copyIndex?: number;
  copyCount?: number;
  storageLocation?: CardStorageLocation;
  reviewMode?: boolean;
  onReviewComplete?: () => void;
  footerActions?: ReactNode;
  onRemoveShortcut?: () => void;
}

export interface CardFilterFieldsProps {
  activeFilters: CardFilters;
  onFiltersChange: (filters: CardFilters) => void;
  activeFilterCount: number;
  availableRarities: ScanStats["rarities"];
  availableColors: ScanStats["colors"];
  availableFoilTypes: { key: string; label: string }[];
  binCount?: number;
}

export interface CardDisplayOptionsProps {
  viewMode?: CardViewMode;
  onViewModeChange?: (mode: CardViewMode) => void;
  density?: CardGridDensity;
  onDensityChange?: (density: CardGridDensity) => void;
  groupDuplicates?: boolean;
  onGroupDuplicatesChange?: (grouped: boolean) => void;
}

export interface CardViewOptionsDrawerProps
  extends CardSortOptionsProps,
    CardFilterFieldsProps,
    CardDisplayOptionsProps {
  triggerClassName?: string;
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

export interface CardCorrectionSearchProps {
  collectionGuid: string | undefined;
  initialQuery?: string;
  capturedImage?: ReactNode;
  disabled?: boolean;
  onSelect: (card: PlayingCard, options: CardCorrectionOptions) => void;
  onCancel: () => void;
}

export interface DetailPrefetchStep {
  collectionGuid: string;
  card: PlayingCard;
  alternativeMatches?: PlayingCard[];
  nextScanId: string | null;
}

export type DetailPrefetchLoader = (
  scanId: string,
) => Promise<DetailPrefetchStep | null>;

export interface ReviewSession {
  index: number;
  size: number;
  previousScanId: string | null;
  resolveNext: (upcomingScanId: string | null | undefined) => string | null;
  forget: (scanId: string) => void;
}

export interface OpenScanOptions {
  inReviewMode?: boolean;
}
