import type { ValueChange } from "@magic-vault/shared";

export type LibraryView = "collections" | "storage";

export interface LibraryViewTabsProps {
  value: LibraryView;
}

export type LibraryValueMode = "value" | "change";

export interface LibraryValueModeTabsProps {
  value: LibraryValueMode;
  onChange: (value: LibraryValueMode) => void;
}

export interface CollectionChangeTrendProps {
  values: number[];
  baseline: number | null;
  change: ValueChange | null;
  noChangeLabel: string;
  label: string;
  className?: string;
}

export interface CollectionChangeSummary {
  values: number[];
  baseline: number | null;
  change: ValueChange | null;
  label: string;
}
