import { ALL_PUBLIC_CARD_GAMES } from "@/lib/constants/public-cards";
import type { PublicCardFilters } from "@magic-vault/shared";

export function countActivePublicCardFilters(
  filters: PublicCardFilters,
  gameKey: string,
): number {
  return (
    filters.sets.length +
    filters.rarities.length +
    filters.colors.length +
    filters.foilTypes.length +
    filters.conditions.length +
    filters.languages.length +
    (filters.finish === "all" ? 0 : 1) +
    (filters.minPrice === null ? 0 : 1) +
    (filters.maxPrice === null ? 0 : 1) +
    (gameKey === ALL_PUBLIC_CARD_GAMES ? 0 : 1)
  );
}

export function parsePriceInput(value: string): number | null {
  if (!value.trim()) return null;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

export function hasPublicCardFilters(filters: PublicCardFilters): boolean {
  return countActivePublicCardFilters(filters, ALL_PUBLIC_CARD_GAMES) > 0;
}
