import type { FieldMeta, PlayingCardWithDistance } from "@magic-vault/shared";
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
}

export interface ScannedCardItemProps {
  card: PlayingCardWithDistance;
  onOpen: () => void;
  binNumber?: number;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  hasAlternatives?: boolean;
  isFoil?: boolean;
  foilType?: string;
  isDownloaded?: boolean;
}

export interface ExportContext {
  isMtg: boolean;
  fieldDefinitions: FieldMeta[];
}

export interface GroupedEntry {
  card: PlayingCardWithDistance;
  quantity: number;
  isFoil: boolean;
}

export type GroupBy = "card" | "card-foil";

export interface ExportAdapter {
  key: string;
  label: string;
  filenameSlug: string;
  groupBy: GroupBy;
  // Game.key values this format applies to, or "all" - game keys are
  // admin-defined free text (see the Games Manager), not a fixed enum, so
  // this can't be a literal union.
  games: "all" | string[];
  headers: (ctx: ExportContext) => string[];
  row: (entry: GroupedEntry, ctx: ExportContext) => string[];
}
