import { EMPTY_CARD_FILTERS, type CollectionCardsQuery, type StorageLocationSeriesFormValues } from "@magic-vault/shared";
import type { StorageLocationBulkSizesFormValues as StorageBulkSizeFormValues } from "@magic-vault/shared";
import type { StorageLocationTab } from "@/lib/interfaces/storage";

export const STORAGE_LOCATION_DEFAULT_CARDS_QUERY: CollectionCardsQuery = {
  search: "",
  sort: null,
  filters: EMPTY_CARD_FILTERS,
  grouped: false,
};

export const STORAGE_LOCATIONS_PAGE_SIZE = 50;

export const STORAGE_LOCATION_TABS: readonly StorageLocationTab[] = ["cards", "verify"];

export const STORAGE_SERIES_DEFAULT_VALUES: StorageLocationSeriesFormValues = {
  prefix: "A",
  firstNumber: 1,
  count: 10,
  capacity: null,
  batchSize: null,
};

export const STORAGE_ADD_ROUTES = {
  location: "/storage-name",
  series: "/storage-series",
} as const;

export const STORAGE_BULK_SIZE_DEFAULT_VALUES: StorageBulkSizeFormValues = {
  capacity: null,
  batchSize: null,
  changesCapacity: false,
  changesBatchSize: false,
};

export const STORAGE_BULK_SIZE_ROUTE = "/storage-bulk-size";
