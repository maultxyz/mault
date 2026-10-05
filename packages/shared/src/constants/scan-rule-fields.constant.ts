import type { ConditionOperator } from "../interfaces/sort-bins.interface";

export const SCAN_RULE_ROOT = "$scan";

export const SCAN_RULE_FOIL_FIELD = "isFoil";
export const SCAN_RULE_FOIL_TYPE_FIELD = "foilType";
export const SCAN_RULE_MATCH_PERCENT_FIELD = "matchPercent";
export const SCAN_RULE_MARKET_VALUE_USD_FIELD = "marketValueUsd";
export const SCAN_RULE_MARKET_VALUE_EUR_FIELD = "marketValueEur";

export const SCAN_RULE_FOIL_VALUE = "foil";
export const SCAN_RULE_NON_FOIL_VALUE = "nonfoil";

export const SCAN_RULE_FOIL_OPERATORS: {
  value: ConditionOperator;
  label: string;
}[] = [
  { value: "equals", label: "is" },
  { value: "not_equals", label: "is not" },
];

export const SCAN_RULE_FOIL_TYPE_OPERATORS: {
  value: ConditionOperator;
  label: string;
}[] = [
  { value: "in", label: "is any of" },
  { value: "not_in", label: "is none of" },
  { value: "is_null", label: "is empty" },
  { value: "is_not_null", label: "is not empty" },
];

export const SCAN_RULE_NUMERIC_OPERATORS: {
  value: ConditionOperator;
  label: string;
}[] = [
  { value: "lt", label: "less than" },
  { value: "lte", label: "less than or equal" },
  { value: "gt", label: "greater than" },
  { value: "gte", label: "greater than or equal" },
];

export const DEFAULT_SCAN_RULE_FIELD_LABELS = {
  foil: "Foil",
  foilType: "Foil type",
  matchPercent: "Match %",
  marketValueUsd: "Market value (USD)",
  marketValueEur: "Market value (EUR)",
  foilOption: "Foil",
  nonFoilOption: "Non-foil",
};
