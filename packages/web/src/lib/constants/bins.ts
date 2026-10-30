import type { ConditionOperator } from "@magic-vault/shared";

export const SORTING_RULES_PATH = "/app/rules";

export const CONDITION_INPUT_CLASS = "max-md:h-10";

export const CONDITION_FIELD_CLASS = "max-md:basis-full";

export const CONDITION_SELECT_TRIGGER_CLASS =
  "max-md:data-[size=default]:h-10 max-md:px-3 max-md:font-normal";

export const MULTI_VALUE_OPERATORS: ConditionOperator[] = [
  "in",
  "not_in",
  "contains_any",
  "contains_all",
  "contains_none",
];

export const DEFAULT_MAX_COPIES = 4;

export const BIN_RULES_EXPORT_FORMAT_VERSION = 3;
export const BIN_RULES_EXPORT_CATCH_ALL_RULES_SINCE = 2;
export const BIN_RULES_EXPORT_LOW_MATCH_COLUMN_SINCE = 3;
export const DEFAULT_CATCH_ALL_MATCH_PERCENT = 80;

export const REPACK_ALLOW_DUPLICATES_VALUE = "$allow";

export const NO_OVERFLOW_VALUE = "$none";
export const REPACK_PRIORITY_AUTO_VALUE = "$auto";

export const PICK_LIST_DECKLIST_MAX_LENGTH = 50000;

export const BIN_SETTINGS_LIST_CLASS =
  "flex flex-col divide-y rounded-lg border";

export const MOBILE_BINS_SCREEN_PARAM = "screen";
export const MOBILE_BINS_BIN_PARAM = "bin";
