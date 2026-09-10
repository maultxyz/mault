import type { ConditionOperator, FieldType } from "@magic-vault/shared";

export const FIELD_TYPES: FieldType[] = ["string", "numeric", "enum", "set"];

export const DEFAULT_OPERATORS_BY_TYPE: Record<
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
    { value: "is_null", label: "is empty" },
    { value: "is_not_null", label: "is not empty" },
  ],
  set: [
    { value: "contains_any", label: "contains any of" },
    { value: "contains_all", label: "contains all of" },
    { value: "contains_none", label: "contains none of" },
    { value: "equals", label: "is exactly" },
    { value: "not_equals", label: "is not exactly" },
    { value: "is_null", label: "is empty" },
    { value: "is_not_null", label: "is not empty" },
  ],
};
