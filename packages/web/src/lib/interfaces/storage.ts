import type { STORAGE_VIEWS } from "@/lib/constants/storage";
import type { ClientPagination } from "@/lib/interfaces/pagination";
import type {
  EmptyAllBinsOptions,
  EmptyBinOptions,
  StorageLocation,
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

export interface MoveCollectionsToLocationInput {
  guid: string;
  collectionGuids: string[];
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

export interface StorageLocationCardsProps {
  location: StorageLocation;
  onOpenCard: (entry: StorageLocationSearchResult) => void;
}

export interface CardStorageLocationSectionProps {
  scanId: string;
  collectionGuid: string | undefined;
  canRemove?: boolean;
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
  scanId: string;
  reviewMode: boolean;
  onNavigate: (scanId: string) => void;
  onClose: () => void;
}

export type StorageView = (typeof STORAGE_VIEWS)[number];

export interface StorageViewSwitchProps {
  value: StorageView;
}
