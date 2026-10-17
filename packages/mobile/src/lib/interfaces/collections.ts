import type { CardFilters, GroupedScannedCard } from "@magic-vault/shared";
import type { StatsBreakdown } from "@/lib/interfaces/stats";

export interface ScanImageResponse {
  capturedImageUrl: string | null;
}

export type CollectionTab = "cards" | "activity";

export interface CardToolbarProps {
  sortLabel: string;
  activeFilterCount: number;
  grouped: boolean;
  needsReview: boolean;
  onOpenSort: () => void;
  onOpenFilters: () => void;
  onToggleGrouped: () => void;
  onToggleNeedsReview: () => void;
}

export interface CardFilterSheetProps {
  visible: boolean;
  filters: CardFilters;
  breakdown: StatsBreakdown | null;
  binCount: number;
  onChange: (filters: CardFilters) => void;
  onClose: () => void;
}

export interface CardActionsSheetProps {
  entry: GroupedScannedCard | null;
  collectionGuid: string;
  foilOptions: string[];
  onClose: () => void;
}

export interface FilterChipProps {
  label: string;
  selected: boolean;
  swatch?: string;
  onPress: () => void;
}
