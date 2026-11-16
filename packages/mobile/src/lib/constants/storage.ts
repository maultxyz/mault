import { EMPTY_CARD_FILTERS, type CollectionCardsQuery } from "@magic-vault/shared";
import type { StorageLocationTab } from "@/lib/interfaces/storage";

export const STORAGE_LOCATION_DEFAULT_CARDS_QUERY: CollectionCardsQuery = {
  search: "",
  sort: null,
  filters: EMPTY_CARD_FILTERS,
  grouped: false,
};

export const STORAGE_LOCATIONS_PAGE_SIZE = 50;

export const STORAGE_LOCATION_TABS: readonly StorageLocationTab[] = ["cards", "verify"];
