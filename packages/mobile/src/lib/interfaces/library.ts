import type { ValueChange } from "@magic-vault/shared";
import type { ReactNode } from "react";
import type { LIBRARY_VALUE_MODES, LIBRARY_VIEWS } from "@/lib/constants/library";

export type LibraryView = (typeof LIBRARY_VIEWS)[number];

export interface LibraryViewProps {
  title: string;
  viewSwitcher: ReactNode;
}

export type LibraryValueMode = (typeof LIBRARY_VALUE_MODES)[number];

export interface CollectionChangeTrendProps {
  values: number[];
  baseline: number | null;
  change: ValueChange | null;
  noChangeLabel: string;
}
