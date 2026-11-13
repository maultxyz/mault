import { DEFAULT_CARD_SORT } from "./constants/collection-cards.constant";
import type { CardSortDirection } from "./interfaces/collection-cards.interface";

export function cardSortDirectionForField(
  sortKey: string | null,
  fieldPath: string,
): CardSortDirection | null {
  if (sortKey === `${fieldPath}-asc`) return "asc";
  if (sortKey === `${fieldPath}-desc`) return "desc";
  return null;
}

export function nextCardSortKeyForField(sortKey: string | null, fieldPath: string): string {
  const currentDirection = cardSortDirectionForField(sortKey, fieldPath);
  if (currentDirection === null) return `${fieldPath}-asc`;
  if (currentDirection === "asc") return `${fieldPath}-desc`;
  return DEFAULT_CARD_SORT;
}
