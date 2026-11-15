import type { CalloutVariant } from "@/lib/interfaces/callout";
import type {
  ScanCardsResultKind,
  StorageLocationView,
} from "@/lib/interfaces/storage";
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
