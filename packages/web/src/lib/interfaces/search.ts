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
