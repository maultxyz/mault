import type { TableSkeletonColumn } from "@/lib/interfaces/skeletons";
import type { CalloutVariant } from "@/lib/interfaces/callout";
import type {
  StorageLocationNameFormValues,
  StorageLocationSeriesFormValues,
} from "@magic-vault/shared";
import type {
  ScanCardsResultKind,
  StorageLocationView,
} from "@/lib/interfaces/storage";
import type { StorageLocationBulkSizesFormValues } from "@magic-vault/shared";
import {
  STORAGE_LABEL_ORG_SEARCH_PARAM,
  STORAGE_LABELS_PATH,
  STORAGE_LOCATION_SEARCH_PARAM,
  STORAGE_PATH,
  type FieldMeta,
} from "@magic-vault/shared";

export {
  STORAGE_LABEL_ORG_SEARCH_PARAM,
  STORAGE_LABELS_PATH,
  STORAGE_LOCATION_SEARCH_PARAM,
  STORAGE_PATH,
};

export const EMPTY_BIN_NEW_LOCATION = "__new__";

export const EMPTY_STORAGE_LOCATION_BULK_SIZES_FORM: StorageLocationBulkSizesFormValues = {
  changesCapacity: false,
  capacity: null,
  changesBatchSize: false,
  batchSize: null,
};

export const STORAGE_LOCATION_BULK_SIZES_FORM_ID = "storage-location-bulk-sizes-form";
export const STORAGE_PLAN_PRESET_SELECT_ID = "storage-plan-preset-select";

export const EMPTY_STORAGE_LOCATION_NAME_FORM: StorageLocationNameFormValues = {
  name: "",
  capacity: null,
  batchSize: null,
};

export const DEFAULT_STORAGE_LOCATION_SERIES_FORM: StorageLocationSeriesFormValues = {
  prefix: "A",
  firstNumber: 1,
  count: 10,
  capacity: null,
  batchSize: null,
};

export const STORAGE_LOCATION_SERIES_PREVIEW_MAX = 6;
export const EMPTY_BIN_NO_LOCATION = "__none__";
export const MOVE_TARGET_COLLECTION_PREFIX = "collection:";
export const STORAGE_CARD_SEARCH_PARAM = "card";
export const STORAGE_REVIEW_SEARCH_PARAM = "review";
export const STORAGE_PAGE_SEARCH_PARAM = "page";

export const STORAGE_LIST_SKELETON_COUNT = 6;
export const LEGACY_STORAGE_VIEW_PARAM = "view";
export const LEGACY_STORAGE_PICKS_VIEW = "picks";
export const EMPTY_FIELD_DEFINITIONS: FieldMeta[] = [];
export const STORAGE_PICK_LIST_PATH = "/app/storage/pick-list";
export const SCAN_CARDS_RESULT_VARIANTS = {
  checked: "success",
  "already-checked": "info",
  "not-listed": "warning",
  "no-match": "info",
  failed: "error",
} as const satisfies Record<ScanCardsResultKind, CalloutVariant>;
export const STORAGE_VIEW_SEARCH_PARAM = "tab";
export const STORAGE_LOCATION_VIEWS: readonly StorageLocationView[] = [
  "cards",
  "verify",
];
export const STORAGE_PANEL_PADDING_TOP = "0.5rem";
export const STORAGE_TOOLBAR_TOP_CSS_VARIABLE = "--storage-toolbar-top";

export function storageLabelsPath(locationGuids: string[] = []): string {
  const params = new URLSearchParams(
    locationGuids.map((locationGuid) => [STORAGE_LOCATION_SEARCH_PARAM, locationGuid]),
  );
  const query = params.toString();
  return query ? `${STORAGE_LABELS_PATH}?${query}` : STORAGE_LABELS_PATH;
}

export const STORAGE_PRESET_USES_HEADING_ID = "storage-preset-uses-heading";

export const STORAGE_CARDS_SKELETON_ROWS = 8;
export const STORAGE_CARDS_SKELETON_TILES = 12;

export const STORAGE_CARD_TABLE_SKELETON_COLUMNS: readonly TableSkeletonColumn[] = [
  { barClassName: "w-6", alignsEnd: true, className: "max-w-12" },
  { barClassName: "", isThumbnail: true, className: "max-w-10" },
  { barClassName: "w-32", className: "flex-[2]" },
  { barClassName: "w-20", className: "hidden sm:flex" },
  { barClassName: "w-8", className: "hidden sm:flex" },
  { barClassName: "w-12", className: "hidden md:flex" },
  { barClassName: "w-20", className: "hidden lg:flex" },
  { barClassName: "w-10", alignsEnd: true },
  { barClassName: "w-10", alignsEnd: true },
  { barClassName: "w-10", alignsEnd: true },
];

export const STORAGE_SEARCH_TABLE_SKELETON_COLUMNS: readonly TableSkeletonColumn[] = [
  { barClassName: "w-24" },
  ...STORAGE_CARD_TABLE_SKELETON_COLUMNS.slice(1),
];

export const STORAGE_CHECK_LIST_SKELETON_COLUMNS: readonly TableSkeletonColumn[] = [
  { barClassName: "size-4 rounded-sm", className: "max-w-10" },
  { barClassName: "w-6", alignsEnd: true, className: "max-w-12" },
  { barClassName: "", isThumbnail: true, className: "max-w-10" },
  { barClassName: "w-32", className: "flex-[2]" },
  { barClassName: "w-20", className: "hidden sm:flex" },
  { barClassName: "w-20", className: "hidden lg:flex" },
];
