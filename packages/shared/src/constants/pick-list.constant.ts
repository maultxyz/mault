import type { PickListMode } from "../interfaces/pick-list.interface";

export const PICK_LIST_MODES: readonly PickListMode[] = ["until_found", "all"];
export const PICK_LIST_MAX_ENTRIES = 500;
export const PICK_LIST_MAX_QUANTITY = 999;
export const PICK_LIST_NAME_MAX_LENGTH = 200;
export const PICK_LIST_FACE_SEPARATOR = "//";
export const DECKLIST_LINE_PATTERN = /^(?:(\d+)\s*x?\s+)?(.+?)$/i;
export const DECKLIST_PRINTING_SUFFIX_PATTERN =
  /\s*(?:\*[a-z]+\*|\[[^\]]*\]|\([^)]*\)(?:\s+[a-z0-9-]+)?)\s*$/i;
export const DECKLIST_SECTION_HEADERS: readonly string[] = [
  "deck",
  "main",
  "mainboard",
  "main deck",
  "sideboard",
  "commander",
  "commanders",
  "companion",
  "maybeboard",
  "considering",
  "tokens",
  "about",
];
export const DECKLIST_COMMENT_PREFIXES: readonly string[] = ["//", "#"];
