import {
  EMPTY_CARD_FILTERS,
  type CollectionCardsQuery,
} from "@magic-vault/shared";

export { EMPTY_CARD_FILTERS };

// Callers that only read the collection-wide totals (summary.all) share this
// query so they share one cached summary request.
export const ALL_CARDS_QUERY: CollectionCardsQuery = {
  search: "",
  sort: null,
  filters: EMPTY_CARD_FILTERS,
  grouped: false,
};
