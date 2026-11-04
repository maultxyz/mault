import type { ClientPagination } from "@/lib/interfaces/pagination";
import type { EmptyBinLocationFormValues } from "@/schemas/storage.schema";
import type { UseFormReturn } from "react-hook-form";
import type { ScanStats } from "@/lib/interfaces/scanner";
import type { CardGridDensity, CardViewMode } from "@/lib/interfaces/cards";
import type {
  CardFilters,
  PickListEntry,
  PickListEntryInput,
  StoragePickListRow,
  StorageVerifyNameCount,
  Collection,
  CollectionCardsQuery,
  FieldMeta,
  EmptyAllBinsOptions,
  EmptyBinOptions,
  StorageLocation,
  StorageLocationCard,
  StorageLocationSearchResult,
} from "@magic-vault/shared";

export interface EmptyBinDialogStep {
  index: number;
  total: number;
}

export interface StorageLocationSelectProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  invalid?: boolean;
}

export interface EmptyAllBinsDialogProps {
  open: boolean;
  bins: { binNumber: number; count: number }[];
  preferLocation: boolean;
  collectionGuid: string | undefined;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: EmptyAllBinsOptions) => Promise<boolean>;
}

export interface MoveCardsToLocationInput {
  guid: string;
  scanIds: string[];
  collectionGuid: string | undefined;
}

export interface RemoveCardFromLocationInput {
  locationGuid: string;
  scanId: string;
  collectionGuid: string | undefined;
  alsoRemoveFromCollection: boolean;
}

export interface RemoveFromLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardName: string;
  locationName: string;
  collectionName: string;
  focusConfirm?: boolean;
  onConfirm: (alsoRemoveFromCollection: boolean) => void;
}

export interface MoveCollectionsToLocationInput {
  guid: string;
  collectionGuids: string[];
}

export interface LocationMoveFormOptions {
  open: boolean;
  excludedLocationGuid?: string;
  showLocations?: boolean;
  collections?: Collection[];
  onMove: (locationGuid: string) => Promise<boolean>;
  onMoveToCollection?: (collectionGuid: string) => Promise<boolean>;
  onMoved: () => void;
}

export interface LocationMoveFieldsProps {
  form: UseFormReturn<EmptyBinLocationFormValues>;
  locations: StorageLocation[];
  showLocations?: boolean;
  collections?: Collection[];
  idPrefix: string;
}

export interface MoveToLocationDialogProps {
  open: boolean;
  count: number;
  excludedLocationGuid?: string;
  isMoving: boolean;
  showLocations?: boolean;
  sourceCollectionGuid?: string;
  onOpenChange: (open: boolean) => void;
  onMove: (locationGuid: string) => Promise<boolean>;
  onMoveToCollection?: (collectionGuid: string) => Promise<boolean>;
}

export interface EmptyBinToLocationDialogProps {
  binNumber: number | null;
  step?: EmptyBinDialogStep;
  title?: string;
  description?: string;
  dismissLabel?: string;
  preferLocation?: boolean;
  collectionGuid: string | undefined;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: EmptyBinOptions) => Promise<void>;
}

export interface StorageExportMenuProps {
  location: StorageLocation;
}

export interface StorageLocationRowProps {
  location: StorageLocation;
  isSelected: boolean;
  onSelect: () => void;
}

export interface StorageLocationListProps {
  locations: StorageLocation[];
  pagination: ClientPagination<StorageLocation>;
  selectedGuid: string | undefined;
  isLoading: boolean;
  onSelect: (guid: string) => void;
}

export interface StorageLocationNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  title: string;
  submitLabel: string;
  onSubmit: (name: string) => Promise<boolean>;
}

export interface StorageLocationCardQueryState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortKey: string | null;
  setSortKey: (sortKey: string | null) => void;
  sortableFields: FieldMeta[];
  filters: CardFilters;
  setFilters: (filters: CardFilters) => void;
  activeFilterCount: number;
  cardsQuery: CollectionCardsQuery;
  stats: ScanStats | null;
}

export interface StorageCardQueryToolbarProps {
  cardQuery: StorageLocationCardQueryState;
  viewMode: CardViewMode;
  onViewModeChange: (mode: CardViewMode) => void;
  density: CardGridDensity;
  onDensityChange: (density: CardGridDensity) => void;
}

export interface StorageCardGridProps {
  entries: StorageLocationSearchResult[];
  density: CardGridDensity;
  onOpenCard: (entry: StorageLocationSearchResult) => void;
}

export interface StorageLocationCardsProps {
  location: StorageLocation;
  cardQuery: StorageLocationCardQueryState;
  onOpenCard: (entry: StorageLocationSearchResult) => void;
}

export interface CardStorageLocationSectionProps {
  scanId: string;
  collectionGuid: string | undefined;
  canEdit?: boolean;
}

export interface StorageCardListProps {
  entries: StorageLocationSearchResult[];
  onOpenLocation?: (guid: string) => void;
  onOpenCard: (entry: StorageLocationSearchResult) => void;
}

export interface StorageSearchResultsProps {
  query: string;
  onOpenLocation: (guid: string) => void;
  onOpenCard: (entry: StorageLocationSearchResult) => void;
}

export interface StorageCardDetailProps {
  location: StorageLocation;
  cardsQuery: CollectionCardsQuery;
  scanId: string;
  reviewMode: boolean;
  onNavigate: (scanId: string) => void;
  onShowReviewGrid: () => void;
  onClose: () => void;
  onReviewed?: (scanId: string) => void;
  onRemoved?: (scanId: string) => void;
}

export interface StorageReviewQueueSession {
  id: number;
  locationGuid: string;
  reviewedScanIds: ReadonlySet<string>;
  removedScanIds: ReadonlySet<string>;
}

export interface StorageReviewQueue {
  cards: StorageLocationCard[];
  totalCards: number;
  isPending: boolean;
  isError: boolean;
  reviewedScanIds: ReadonlySet<string>;
  removedScanIds: ReadonlySet<string>;
  markReviewed: (scanId: string) => void;
  markRemoved: (scanId: string) => void;
}

export interface StoragePickListState {
  decklist: string;
  entries: PickListEntryInput[];
  lines: PickListEntry[];
  cards: StorageLocationSearchResult[];
  pickedScanIds: ReadonlySet<string>;
  pickedCount: number;
  isLoading: boolean;
  isError: boolean;
  isFinishing: boolean;
  setDecklist: (decklist: string) => void;
  setPicked: (scanId: string, picked: boolean) => void;
  clear: () => void;
  finish: () => void;
}

export type ScanCardsMode = "pick" | "verify";

export type ScanCardsResultKind =
  | "checked"
  | "already-checked"
  | "not-listed"
  | "no-match"
  | "failed";

export interface ScanCardsResult {
  resultId: number;
  kind: ScanCardsResultKind;
  cardName?: string;
  locationName?: string;
  position?: number;
}

export interface ScanCardsSource {
  cards: StorageLocationSearchResult[];
  checkedScanIds: ReadonlySet<string>;
  setChecked: (scanId: string, checked: boolean) => void;
  onNotListed?: (cardName: string) => void;
}

export interface ScanCards {
  canScan: boolean;
  isScanning: boolean;
  result: ScanCardsResult | null;
  scanVideoFrame: (
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
  ) => Promise<void>;
}

export interface ScanCardsPanelProps {
  source: ScanCardsSource;
  mode: ScanCardsMode;
}

export interface StoragePickListFormProps {
  initialDecklist: string;
  onSubmit: (decklist: string) => void;
  onCancel?: () => void;
}

export interface StoragePickListRowsProps {
  rows: StoragePickListRow[];
  showLocation: boolean;
  checkLabel: string;
  onCheckedChange: (scanId: string, checked: boolean) => void;
}

export interface StorageCheckListProps {
  rows: StoragePickListRow[];
  checkedCount: number;
  total: number;
  progressLabel: string;
  showLocation: boolean;
  checkLabel: string;
  onCheckedChange: (scanId: string, checked: boolean) => void;
}

export interface StoragePickListSheetProps {
  pickList: StoragePickListState;
}

export interface StorageVerifyState {
  cards: StorageLocationSearchResult[];
  verifiedScanIds: ReadonlySet<string>;
  verifiedCount: number;
  notInLocation: StorageVerifyNameCount[];
  isLoading: boolean;
  isError: boolean;
  isTruncated: boolean;
  setVerified: (scanId: string, verified: boolean) => void;
  addNotInLocation: (cardName: string) => void;
  startOver: () => void;
}

export interface StorageLocationVerifyProps {
  location: StorageLocation;
}

export type StorageLocationView = "cards" | "verify";
