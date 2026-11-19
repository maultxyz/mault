import type { CatalogGame, PlayingCard } from "@magic-vault/shared";
import type { ComponentType, ReactNode } from "react";

export type { CatalogCardResult } from "@magic-vault/shared";

export interface CardPrintingsGridProps {
  game: CatalogGame | null;
  openedCardId: string;
  selectedCardId: string;
  onSelect: (printing: PlayingCard) => void;
}

export interface CardPrintingTileProps {
  printing: PlayingCard;
  isSelected: boolean;
  onSelect: (printing: PlayingCard) => void;
}

export type { AddCatalogCardInput } from "@magic-vault/shared";

export interface GlobalSearchGameBadgesProps {
  label: string;
  allGamesLabel: string;
  games: CatalogGame[];
  selectedGameKey: string | null;
  onSelect: (gameKey: string | null) => void;
}

export interface GlobalSearchShowMoreItemProps {
  value: string;
  label: string;
  isLoading: boolean;
  onSelect: () => void;
}

export interface GlobalSearchState {
  isOpen: boolean;
  initialQuery: string;
  selectedGameKey: string | null;
}

export interface GlobalSearchResultItemProps {
  value: string;
  title: string;
  subtitle?: string | null;
  leading: ReactNode;
  onSelect: () => void;
}

export interface GlobalSearchLoadingGroupProps {
  heading: string;
}

export interface SearchResultIconProps {
  icon: ComponentType<{ className?: string }>;
}

export interface GlobalSearchEntryProps {
  className?: string;
}
