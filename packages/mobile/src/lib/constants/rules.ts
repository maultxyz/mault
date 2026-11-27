import type { ConditionOperator } from "@magic-vault/shared";
import type { BinSetMode } from "@magic-vault/shared";

export const VALUELESS_OPERATORS: ConditionOperator[] = ["is_null", "is_not_null"];
export const MAX_RULE_GROUP_DEPTH = 2;
export const BIN_ROW_MAX_CHIPS = 3;
export const CONDITION_SHEET_MAX_HEIGHT_RATIO = 0.9;
export const NUMERIC_INPUT_PATTERN = /^-?\d*\.?\d*$/;
export const RULE_DATE_INPUT_MAX_LENGTH = 10;
export const SORTING_MODES: BinSetMode[] = ["rules", "scan-only", "auto-assign", "game-sort", "repack", "alphabet", "chaos"];
export const REPACK_ALLOW_DUPLICATES_VALUE = "$allow";
export const PRESET_OPTION_PREFIX = "preset:";
export const WORKFLOW_OPTION_PREFIX = "workflow:";
export const STORAGE_PLAN_FILL_BAR_WIDTH = 56;
export const DEFAULT_MAX_COPIES = 4;
export const ALLOW_DUPLICATES_OPTION = "$allow";
export const EMPTY_BIN_NO_LOCATION_OPTION = "$none";
export const EMPTY_BIN_CLAIMED_LOCATION_OPTION = "$claimed";
export const BIN_RULES_FILE_MIME_TYPES = ["application/json", "text/json", "text/plain"];
