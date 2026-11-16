import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { EMPTY_CARD_FILTERS, type CardFilters } from "@magic-vault/shared";
import { useStation } from "@/features/scanner/api/use-stations";
import { useCardFiltersSearchParams } from "@/hooks/use-card-filters-search-params";
import type { CardFiltersContextValue } from "@/lib/interfaces/cards";

function toggleItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

const CardFiltersContext = createContext<CardFiltersContextValue | null>(null);

export function CardFiltersProvider({ children }: { children: React.ReactNode }) {
  const { isActive: isActiveStation } = useStation();
  const { filters: urlFilters, updateFilters: updateUrlFilters } =
    useCardFiltersSearchParams();
  const [backgroundStationFilters, setBackgroundStationFilters] =
    useState<CardFilters>(EMPTY_CARD_FILTERS);
  const filters = isActiveStation ? urlFilters : backgroundStationFilters;

  const updateFilters = useCallback(
    (update: (previous: CardFilters) => CardFilters) => {
      if (isActiveStation) updateUrlFilters(update);
      else setBackgroundStationFilters(update);
    },
    [isActiveStation, updateUrlFilters],
  );

  const setFilters = useCallback(
    (nextFilters: CardFilters) => updateFilters(() => nextFilters),
    [updateFilters],
  );

  const toggleRarity = useCallback(
    (rarity: string) =>
      updateFilters((prev) => ({
        ...prev,
        rarities: toggleItem(prev.rarities, rarity),
      })),
    [updateFilters],
  );

  const toggleColor = useCallback(
    (color: string) =>
      updateFilters((prev) => ({
        ...prev,
        colors: toggleItem(prev.colors, color),
      })),
    [updateFilters],
  );

  const toggleSet = useCallback(
    (setCode: string) =>
      updateFilters((prev) => ({
        ...prev,
        sets: toggleItem(prev.sets, setCode),
      })),
    [updateFilters],
  );

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
