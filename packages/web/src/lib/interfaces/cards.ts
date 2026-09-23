import type {
  FieldMeta,
  PlayingCardWithDistance,
  ScannedCard,
} from "@magic-vault/shared";
import type { ReactElement } from "react";

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

export interface CardFilters {
  colors: string[];
  rarities: string[];
  bins: Array<number | null>;
  needsAttention: boolean;
  showDownloaded: boolean;
  sets: string[];
  minMatchPercent: number;
  foilTypes: string[];
}

export type CardViewMode = "grid" | "list";

// One display tile for the grid/list — either a single scanned instance
// (scanIds.length === 1) or several identical printings collapsed together
// when duplicate grouping is on (scanIds holds every instance in the group,
// `card`/`scanId` are the representative — most recent — instance).
export interface GroupedScannedCard extends ScannedCard {
  scanIds: string[];
  quantity: number;
}

export interface CardToolbarProps {
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
  onToggleSelect?: () => void;
  hasAlternatives?: boolean;
  wasCorrected?: boolean;
  isFoil?: boolean;
  foilType?: string;
  isDownloaded?: boolean;
  quantity?: number;
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
