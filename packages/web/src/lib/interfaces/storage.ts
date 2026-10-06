import type {
  EmptyBinOptions,
  StorageLocation,
  StorageLocationSearchResult,
} from "@magic-vault/shared";

export interface EmptyBinDialogStep {
  index: number;
  total: number;
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

export interface StorageLocationRowProps {
  location: StorageLocation;
  isSelected: boolean;
  onSelect: () => void;
}

export interface StorageLocationListProps {
  locations: StorageLocation[];
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
}

export interface CardStorageLocationSectionProps {
  scanId: string;
  collectionGuid: string | undefined;
}

export interface StorageCardListProps {
  entries: StorageLocationSearchResult[];
  onOpenLocation?: (guid: string) => void;
}

export interface StorageSearchResultsProps {
  query: string;
  onOpenLocation: (guid: string) => void;
}
