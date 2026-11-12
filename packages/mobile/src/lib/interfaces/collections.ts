import type { UseQueryResult } from "@tanstack/react-query";
import type {
  CardFilters,
  Collection,
  GroupedScannedCard,
  ScanTimelineGrouping,
} from "@magic-vault/shared";
import type { StatsBreakdown } from "@/lib/interfaces/stats";

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
  onChange: (filters: CardFilters) => void;
  onClose: () => void;
}

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
