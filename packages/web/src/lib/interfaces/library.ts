import type { ValueChange } from "@magic-vault/shared";
import type { ReactNode } from "react";

export type LibraryView = "collections" | "storage" | "trades";

export interface LibraryViewTabsProps {
  value: LibraryView;
}

export interface LibraryPageHeaderProps {
  view: LibraryView;
  description: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export type LibraryValueMode = "value" | "change";

export interface LibraryValueModeSwitchProps {
  value: LibraryValueMode;
  onChange: (value: LibraryValueMode) => void;
}

export interface CollectionChangeTrendProps {
  values: number[];
  baseline: number | null;
  change: ValueChange | null;
  noChangeLabel: string;
  label: string;
  isLoading?: boolean;
  className?: string;
}

export interface CollectionChangeSummary {
  values: number[];
  baseline: number | null;
  change: ValueChange | null;
  label: string;
  isLoading: boolean;
}
