import type { ReactNode } from "react";
import type { Collection, PlayingCard, StorageLocation } from "@magic-vault/shared";
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

export interface CatalogGame {
  gameKey: string;
  gameName: string;
  lang: string;
  collectionGuid: string;
}

export interface CatalogCardResult {
  game: CatalogGame;
  card: PlayingCard;
}

export type CatalogCardRouteParams = {
  id: string;
  gameKey: string;
};
