import type { UseQueryResult } from "@tanstack/react-query";
import type {
  CardFilters,
  Collection,
  CollectionCsvParseResult,
  GroupedScannedCard,
  InlineUnmatchedCard,
  ScanTimelineGrouping,
} from "@magic-vault/shared";
import type { CardUpdateBody } from "@/lib/interfaces/cards";
import type { PriceFormatter } from "@/lib/interfaces/pricing";
import type { StatsBreakdown } from "@/lib/interfaces/stats";

export interface CollectionCardTileProps {
  item: GroupedScannedCard;
  width: number;
  pricing: PriceFormatter;
  onOpen: (scanId: string) => void;
  onPrefetch: (scanId: string) => void;
  onShowActions: (item: GroupedScannedCard) => void;
  isSelecting?: boolean;
  isSelected?: boolean;
  onToggleSelected?: (item: GroupedScannedCard) => void;
}

export interface CollectionUnmatchedTileProps {
  entry: InlineUnmatchedCard;
  width: number;
  onOpen: (scanId: string) => void;
}

export interface CollectionMoreUnmatchedTileProps {
  hiddenCount: number;
  width: number;
  onOpen: () => void;
}

export interface ScanImageResponse {
  capturedImageUrl: string | null;
  capturedBackImageUrl?: string | null;
}


export interface CardToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  searchPlaceholder: string;
  searchAccessibilityLabel: string;
  activeSortAndFilterCount: number;
  onOpenViewOptions: () => void;
}

export interface CardSortOption {
  key: string;
  label: string;
  selected: boolean;
  sortKeyOnPress: string;
}

export type CardViewMode = "grid" | "list";

export interface CardViewOptionsSheetProps {
  visible: boolean;
  viewMode?: CardViewMode;
  onViewModeChange?: (mode: CardViewMode) => void;
  grouped?: boolean;
  onGroupedChange?: (grouped: boolean) => void;
  scanTimeline?: CollectionScanTimeline;
  onScanTimelineChange?: (scanTimeline: CollectionScanTimeline) => void;
  sortOptions: CardSortOption[];
  onSortChange: (sort: string) => void;
  filters: CardFilters;
  breakdown: StatsBreakdown | null;
  binCount?: number;
  openBuyGuid?: string | null;
  cardSize?: CardSize;
  onCardSizeChange?: (cardSize: CardSize) => void;
  onChange: (filters: CardFilters) => void;
  onClose: () => void;
}

export type CardSize = "small" | "medium" | "large";

export interface CardActionsSheetProps {
  entry: GroupedScannedCard | null;
  collectionGuid: string;
  foilOptions: string[];
  onClose: () => void;
}

export interface MoveCardsToCollectionOptions {
  sourceCollectionGuid: string;
  onMoved?: () => void;
}

export interface MoveCardsToCollectionVariables {
  scanIds: string[];
  targetCollectionGuid: string;
}

export interface FilterChipProps {
  label: string;
  selected: boolean;
  selectionRole?: "checkbox" | "radio";
  swatch?: string;
  onPress: () => void;
}

export interface ScanTarget {
  collection: Collection | null;
  collections: Collection[];
  collectionsQuery: UseQueryResult<Collection[]>;
  setScanTargetGuid: (collectionGuid: string) => void;
}

export type CollectionScanTimeline = "off" | ScanTimelineGrouping;

export interface CollectionCardsQueryInput {
  search: string;
  sort: string | null;
  filters: CardFilters;
  grouped: boolean;
  scanTimeline: CollectionScanTimeline;
}

export type ScanTimelineListRow =
  | { kind: "header"; key: string; bucketKey: string; cardCount: number }
  | { kind: "cards"; key: string; cards: GroupedScannedCard[] };

export interface CollectionActionTarget {
  guid: string;
  name: string;
}

export interface CollectionActionsOptions {
  includesScanInto?: boolean;
  shareLinkCountGuid?: string | null;
  onDeleted?: () => void;
}

export interface CardActionsUpdate {
  scanIds: string[];
  body: CardUpdateBody;
  undoBody?: CardUpdateBody;
  changeMessage?: string;
  isUndo?: boolean;
}

export interface CardActionsLocationMove {
  scanIds: string[];
  locationGuid: string;
  previousLocationGuid: string | null;
  canUndo: boolean;
}

export interface CollectionCsvImportFile {
  fileName: string;
  parsed: CollectionCsvParseResult;
}

export interface CardPriceRangeFieldsProps {
  minPrice: number | null;
  maxPrice: number | null;
  onChange: (range: { minPrice: number | null; maxPrice: number | null }) => void;
}
