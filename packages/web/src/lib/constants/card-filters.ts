import {
  EMPTY_CARD_FILTERS,
  type CollectionCardsQuery,
} from "@magic-vault/shared";


export const ALL_CARDS_QUERY: CollectionCardsQuery = {
  search: "",
  sort: null,
  filters: EMPTY_CARD_FILTERS,
  grouped: false,
};

export const NEW_CARDS_QUERY: CollectionCardsQuery = {
  ...ALL_CARDS_QUERY,
  filters: { ...EMPTY_CARD_FILTERS, hideDownloaded: true },
};
