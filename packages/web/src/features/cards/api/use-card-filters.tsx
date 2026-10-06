import { createContext, useCallback, useContext, useState } from "react";
import { EMPTY_CARD_FILTERS, type CardFilters } from "@magic-vault/shared";
import type { CardFiltersContextValue } from "@/lib/interfaces/cards";

function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
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
