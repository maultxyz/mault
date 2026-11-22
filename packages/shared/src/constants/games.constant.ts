import type { ConditionOperator, FieldOption, FieldType } from "../interfaces/sort-bins.interface";

export const GAME_KEY_PATTERN = /^[a-z0-9-]+$/;

export const GAME_FIELD_TYPES = ["string", "numeric", "enum", "set", "boolean", "date"] as const satisfies readonly FieldType[];

export const GAME_FIELD_TYPES_WITH_OPTIONS: readonly FieldType[] = ["enum", "set"];

export const RULE_BOOLEAN_TRUE_VALUE = "true";
export const RULE_BOOLEAN_FALSE_VALUE = "false";

export const BOOLEAN_FIELD_OPTIONS: FieldOption[] = [
  { value: RULE_BOOLEAN_TRUE_VALUE, label: "Yes" },
  { value: RULE_BOOLEAN_FALSE_VALUE, label: "No" },
];

export const DEFAULT_OPERATORS_BY_FIELD_TYPE: Record<
  FieldType,
  { value: ConditionOperator; label: string }[]
> = {
  string: [
    { value: "contains", label: "contains" },
    { value: "not_contains", label: "does not contain" },
    { value: "starts_with", label: "starts with" },
    { value: "ends_with", label: "ends with" },
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "does not equal" },
    { value: "is_null", label: "is empty" },
    { value: "is_not_null", label: "is not empty" },
  ],
  numeric: [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "does not equal" },
    { value: "gt", label: "greater than" },
    { value: "gte", label: "greater than or equal" },
    { value: "lt", label: "less than" },
    { value: "lte", label: "less than or equal" },
    { value: "is_null", label: "is unknown" },
    { value: "is_not_null", label: "is known" },
  ],
  enum: [
    { value: "in", label: "is any of" },
    { value: "not_in", label: "is none of" },
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "does not equal" },
    { value: "count_equals", label: "item count equals" },
    { value: "count_gt", label: "item count greater than" },
    { value: "count_lt", label: "item count less than" },
    { value: "is_null", label: "is empty" },
    { value: "is_not_null", label: "is not empty" },
  ],
  set: [
    { value: "contains_any", label: "contains any of" },
    { value: "contains_all", label: "contains all of" },
    { value: "contains_none", label: "contains none of" },
    { value: "equals", label: "is exactly" },
    { value: "not_equals", label: "is not exactly" },
    { value: "count_equals", label: "item count equals" },
    { value: "count_gt", label: "item count greater than" },
    { value: "count_lt", label: "item count less than" },
    { value: "is_null", label: "is empty" },
    { value: "is_not_null", label: "is not empty" },
  ],
  boolean: [
    { value: "equals", label: "is" },
    { value: "not_equals", label: "is not" },
    { value: "is_null", label: "is unknown" },
    { value: "is_not_null", label: "is known" },
  ],
  date: [
    { value: "equals", label: "is on" },
    { value: "not_equals", label: "is not on" },
    { value: "gt", label: "is after" },
    { value: "gte", label: "is on or after" },
    { value: "lt", label: "is before" },
    { value: "lte", label: "is on or before" },
    { value: "is_null", label: "is unknown" },
    { value: "is_not_null", label: "is known" },
  ],
};

export const DEFAULT_GAME_CATALOG_LANG = "en";

export const GAME_CATALOG_LANG_BY_GAME_KEY: Record<string, string> = {
  pokemonjp: "ja",
};
