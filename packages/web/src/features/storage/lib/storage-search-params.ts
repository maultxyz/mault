import { writeCardFiltersToSearchParams } from "@/lib/card-search-params";
import {
  STORAGE_CARD_SEARCH_PARAM,
  STORAGE_LOCATION_SEARCH_PARAM,
  STORAGE_PAGE_SEARCH_PARAM,
  STORAGE_REVIEW_SEARCH_PARAM,
  STORAGE_VIEW_SEARCH_PARAM,
} from "@/lib/constants/storage";
import type { StorageSelectionSearchParams } from "@/lib/interfaces/storage";
import { EMPTY_CARD_FILTERS } from "@magic-vault/shared";

export function writeStorageSelectionSearchParams(
  searchParams: URLSearchParams,
  {
    locationGuid,
    shownLocationGuid,
    scanId = null,
    reviewParamValue = null,
  }: StorageSelectionSearchParams,
) {
  if (locationGuid !== (shownLocationGuid ?? null)) {
    searchParams.delete(STORAGE_PAGE_SEARCH_PARAM);
    searchParams.delete(STORAGE_VIEW_SEARCH_PARAM);
    writeCardFiltersToSearchParams(searchParams, EMPTY_CARD_FILTERS);
  }
  if (locationGuid) searchParams.set(STORAGE_LOCATION_SEARCH_PARAM, locationGuid);
  else searchParams.delete(STORAGE_LOCATION_SEARCH_PARAM);
  if (scanId) searchParams.set(STORAGE_CARD_SEARCH_PARAM, scanId);
  else searchParams.delete(STORAGE_CARD_SEARCH_PARAM);
  if (reviewParamValue) {
    searchParams.set(STORAGE_REVIEW_SEARCH_PARAM, reviewParamValue);
  } else {
    searchParams.delete(STORAGE_REVIEW_SEARCH_PARAM);
  }
}
