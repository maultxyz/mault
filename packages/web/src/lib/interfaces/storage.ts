import type { EmptyBinOptions, StorageLocation } from "@magic-vault/shared";

export interface EmptyBinToLocationDialogProps {
  binNumber: number | null;
  collectionGuid: string | undefined;
  onOpenChange: (open: boolean) => void;
  onConfirm: (binNumber: number, options: EmptyBinOptions) => Promise<void>;
}

export interface StorageLocationRowProps {
  location: StorageLocation;
  isSelected: boolean;
  onSelect: () => void;
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
