import {
  EMPTY_CARD_FILTERS,
  type CollectionCardsQuery,
} from "@magic-vault/shared";

export { EMPTY_CARD_FILTERS };

export const ALL_CARDS_QUERY: CollectionCardsQuery = {
  search: "",
  sort: null,
  filters: EMPTY_CARD_FILTERS,
  grouped: false,
};
