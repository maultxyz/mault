import type { ConditionOperator } from "@magic-vault/shared";

// Operators whose value picker needs a multi-select rather than a single input.
export const MULTI_VALUE_OPERATORS: ConditionOperator[] = [
  "in",
  "not_in",
  "contains_any",
  "contains_all",
  "contains_none",
];
