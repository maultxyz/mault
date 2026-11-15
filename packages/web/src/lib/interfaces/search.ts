import type { CatalogGame, PlayingCard } from "@magic-vault/shared";
import type { ComponentType, ReactNode } from "react";

export interface CatalogCardResult {
  game: CatalogGame;
  card: PlayingCard;
  printingCount: number;
}

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

export interface AddCatalogCardInput {
  collectionGuid: string;
  card: PlayingCard;
}

export interface SearchResultSectionProps {
  title: string;
  isLoading?: boolean;
  children?: ReactNode;
}

export interface SearchResultRowProps {
  to: string;
  title: string;
  subtitle?: string | null;
  leading: ReactNode;
  onNavigate?: () => void;
}

export interface SearchResultIconProps {
  icon: ComponentType<{ className?: string }>;
}

export interface GlobalSearchEntryProps {
  className?: string;
}
