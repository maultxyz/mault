import type { ReactNode } from "react";
import type { CatalogGame, Collection, PlayingCard, StorageLocation } from "@magic-vault/shared";
import type { SettingsSectionLink } from "@/lib/interfaces/settings";

export interface SwipeRowAction {
  label: string;
  onPress: () => void;
}

export interface SwipeRowActionsProps {
  moreAction?: SwipeRowAction;
  destructiveAction?: SwipeRowAction;
  children: ReactNode;
}

export interface GlobalSearchLocalResults {
  collections: Collection[];
  locations: StorageLocation[];
  settingsSections: SettingsSectionLink[];
}

export type { CatalogCardResult } from "@magic-vault/shared";

export interface CardPrintingsGridProps {
  game: CatalogGame | null;
  openedCardId: string;
  selectedCardId: string;
  onSelect: (printing: PlayingCard) => void;
}

export type CatalogCardRouteParams = {
  id: string;
  gameKey: string;
};
