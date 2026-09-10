import type { ConditionOperator } from "@magic-vault/shared";

export const MULTI_VALUE_OPERATORS: ConditionOperator[] = [
  "in",
  "not_in",
  "contains_any",
  "contains_all",
  "contains_none",
];
