import {
  DEFAULT_CARD_SORT,
  EMPTY_CARD_FILTERS,
} from "./constants/collection-cards.constant";
import type {
  CardFilters,
  CollectionCardsPage,
  CollectionCardsQuery,
  CollectionCardsSummary,
} from "./interfaces/collection-cards.interface";
import type { ScannedCard } from "./interfaces/scanner.interface";

function hasNoCardFilters(filters: CardFilters): boolean {
  const filterKeys = Object.keys(EMPTY_CARD_FILTERS) as (keyof CardFilters)[];
  return (
    !filters.intakeLotGuid &&
    filterKeys.every((key) => {
      const value = filters[key];
      return Array.isArray(value)
        ? value.length === 0
        : value === EMPTY_CARD_FILTERS[key];
    })
  );
}

export function cardsQueryMatchesEveryCard(query: CollectionCardsQuery): boolean {
  return (
    query.search === "" && !query.unreviewed && hasNoCardFilters(query.filters)
  );
}

export function cardsQueryListsNewestScansFirst(
  query: CollectionCardsQuery,
): boolean {
  return (
    cardsQueryMatchesEveryCard(query) &&
    !query.grouped &&
    (query.sort === null || query.sort === DEFAULT_CARD_SORT)
  );
}

export function cardsPageWithScannedCard(
  page: CollectionCardsPage,
  card: ScannedCard,
): CollectionCardsPage {
  if (page.items.some((item) => item.scanIds.includes(card.scanId))) return page;
  return {
    ...page,
    items: [
      { ...card, scanIds: [card.scanId], quantity: 1 },
      ...page.items,
    ].slice(0, Math.max(page.pageSize, 1)),
    totalEntries: page.totalEntries + 1,
    totalCards: page.totalCards + 1,
  };
}

export function cardsSummaryWithScannedCards(
  summary: CollectionCardsSummary,
  query: CollectionCardsQuery,
  scannedCardCount: number,
): CollectionCardsSummary {
  return {
    ...summary,
    all: {
      ...summary.all,
      totalCount: summary.all.totalCount + scannedCardCount,
    },
    filtered: cardsQueryMatchesEveryCard(query)
      ? {
          ...summary.filtered,
          totalCount: summary.filtered.totalCount + scannedCardCount,
        }
      : summary.filtered,
  };
}
