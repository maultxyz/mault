import type { CardFilters } from "@/features/cards/types";
import { EMPTY_CARD_FILTERS } from "@/lib/constants/card-filters";
import { createContext, useCallback, useContext, useState } from "react";

function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

interface CardFiltersContextValue {
  filters: CardFilters;
  setFilters: (filters: CardFilters) => void;
  toggleRarity: (rarity: string) => void;
  toggleColor: (color: string) => void;
  toggleSet: (setCode: string) => void;
}

const CardFiltersContext = createContext<CardFiltersContextValue | null>(null);

export function CardFiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<CardFilters>(EMPTY_CARD_FILTERS);

  const toggleRarity = useCallback((rarity: string) => {
    setFilters((prev) => ({ ...prev, rarities: toggleItem(prev.rarities, rarity) }));
  }, []);

  const toggleColor = useCallback((color: string) => {
    setFilters((prev) => ({ ...prev, colors: toggleItem(prev.colors, color) }));
  }, []);

  const toggleSet = useCallback((setCode: string) => {
    setFilters((prev) => ({ ...prev, sets: toggleItem(prev.sets, setCode) }));
  }, []);

  return (
    <CardFiltersContext
      value={{ filters, setFilters, toggleRarity, toggleColor, toggleSet }}
    >
      {children}
    </CardFiltersContext>
  );
}

export function useCardFilters() {
  const context = useContext(CardFiltersContext);
  if (!context) {
    throw new Error("useCardFilters must be used within a CardFiltersProvider");
  }
  return context;
}
