import type { ReactNode } from "react";
import type { Collection, StorageLocation } from "@magic-vault/shared";
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
