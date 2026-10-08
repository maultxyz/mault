import type { Game } from "./games.interface";

export type ConditionField = string;

export type FieldRenames = Record<ConditionField, ConditionField>;

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "not_in"
  | "contains_any"
  | "contains_all"
  | "contains_none"
  | "is_null"
  | "is_not_null";

export interface BinCondition {
  id: string;
  field: ConditionField;
  operator: ConditionOperator;
  value: string | number | string[];
}

export interface BinRuleGroup {
  id: string;
  combinator: "and" | "or";
  conditions: (BinCondition | BinRuleGroup)[];
}

export type FieldType = "string" | "numeric" | "enum" | "set";

export interface FieldMeta {
  field: ConditionField;
  label: string;
  type: FieldType;
  path: string;
  operators: { value: ConditionOperator; label: string }[];
  options?: { value: string; label: string }[];
}

export function isRuleGroup(
  item: BinCondition | BinRuleGroup,
): item is BinRuleGroup {
  return "combinator" in item && "conditions" in item;
}

export interface BinConfig {
  guid: string;
  binNumber: number;
  rules: BinRuleGroup;
  isCatchAll?: boolean;
  isOverride?: boolean;
  overridePriority?: number | null;
  lowMatchPercent?: number | null;
  cardLimit?: number | null;
  maxCopies?: number | null;
  isDisabled?: boolean;
  lastEmptiedAt?: number | null;
}

export type BinSizePreset = "small" | "medium" | "large" | "unlimited";

export type BinSizeOption = BinSizePreset | "custom";

export interface BinHeightPreset {
  key: BinSizePreset;
  height: number;
}

export interface RepackSlot {
  id: string;
  rule: BinRuleGroup;
  targetCount: number;
}

export interface BinSet {
  guid: string;
  name: string;
  isActive: boolean;
  bins: BinConfig[];
  game: Game | null;
  autoAssignField: string | null;
  scanOnly: boolean;
  isRepackMode: boolean;
  repackSlots: RepackSlot[];
  repackAllowDuplicates: boolean;
  repackSiftRules: BinRuleGroup | null;
  isAlphabetMode: boolean;
  alphabetPass: number;
  alphabetPrefix: string;
  isChaosMode: boolean;
  chaosBinSize: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlphabetStep {
  pass: number;
  prefix: string;
}

export type DefaultBinInit = {
  binNumber: number;
  rules: BinRuleGroup;
  isCatchAll: boolean;
  isOverride?: boolean;
  overridePriority?: number | null;
  lowMatchPercent?: number | null;
  cardLimit: number | null;
  maxCopies?: number | null;
  isDisabled?: boolean;
};
