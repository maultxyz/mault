import type { ConditionOperator } from "@magic-vault/shared";
import type { BinSetMode } from "@magic-vault/shared";

export const MULTI_VALUE_OPERATORS: ConditionOperator[] = [
  "in",
  "not_in",
  "contains_any",
  "contains_all",
  "contains_none",
];
export const VALUELESS_OPERATORS: ConditionOperator[] = ["is_null", "is_not_null"];
export const MAX_RULE_GROUP_DEPTH = 2;
export const BIN_ROW_MAX_CHIPS = 3;
export const CONDITION_SHEET_MAX_HEIGHT_RATIO = 0.9;
export const NUMERIC_INPUT_PATTERN = /^-?\d*\.?\d*$/;
export const SORTING_MODES: BinSetMode[] = ["rules", "scan-only", "auto-assign", "repack", "alphabet", "chaos"];
export const REPACK_ALLOW_DUPLICATES_VALUE = "$allow";
