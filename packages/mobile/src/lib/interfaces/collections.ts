import type { CardFilters, GroupedScannedCard } from "@magic-vault/shared";
import type { StatsBreakdown } from "@/lib/interfaces/stats";

export interface ScanImageResponse {
  capturedImageUrl: string | null;
  capturedBackImageUrl?: string | null;
}

export type CollectionTab = "cards" | "activity";

export interface CardToolbarProps {
  activeSortAndFilterCount: number;
  needsReview: boolean;
  onOpenViewOptions: () => void;
  onToggleNeedsReview: () => void;
}

export interface CardSortOption {
  value: string;
  label: string;
}

export type CardViewMode = "grid" | "list";

export interface CardViewOptionsSheetProps {
  visible: boolean;
  viewMode?: CardViewMode;
  onViewModeChange?: (mode: CardViewMode) => void;
  grouped?: boolean;
  onGroupedChange?: (grouped: boolean) => void;
  sortOptions: CardSortOption[];
  selectedSort: string;
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
