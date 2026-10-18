export const COLLECTIONS_SECTION_CLASS = "flex flex-col gap-2";

export const COLLECTIONS_SECTION_LABEL_CLASS =
  "text-xs font-medium uppercase tracking-wide text-foreground/70";

export const COLLECTIONS_LIST_CLASS =
  "flex flex-col divide-y overflow-hidden rounded-lg border";

export const MOBILE_HOME_SEARCH_MIN_COLLECTIONS = 6;

export const COLLECTIONS_PATH = "/app/collections";

export function collectionViewPath(guid: string): string {
  return `${COLLECTIONS_PATH}/${guid}`;
}
