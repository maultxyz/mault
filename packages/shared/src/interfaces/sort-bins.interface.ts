import type { Game } from "./games.interface";
import type { PickList } from "./pick-list.interface";

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
  | "count_equals"
  | "count_gt"
  | "count_lt"
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
  maxCopies?: number | null;
  maxCopiesBy?: string | null;
  overflowBin?: number | null;
  isDisabled?: boolean;
  pickList?: PickList | null;
  repackPriority?: number | null;
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

export interface RepackConfigPatch {
  isRepackMode: boolean;
  repackSlots: RepackSlot[];
  repackUniqueBy: string | null;
  repackSiftRules: BinRuleGroup | null;
  repackMultiplePacks?: boolean;
}

export interface BinSet {
  guid: string;
  name: string;
  isActive: boolean;
  bins: BinConfig[];
  game: Game | null;
  autoAssignField: string | null;
  scanOnly: boolean;
  scanOnlyBin: number | null;
  isRepackMode: boolean;
  repackSlots: RepackSlot[];
  repackUniqueBy: string | null;
  repackSiftRules: BinRuleGroup | null;
  repackMultiplePacks: boolean;
  isAlphabetMode: boolean;
  alphabetPass: number;
  alphabetPrefix: string;
  isChaosMode: boolean;
  chaosBinSize: number | null;
  skipSaving: boolean;
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
  maxCopies?: number | null;
  maxCopiesBy?: string | null;
  overflowBin?: number | null;
  isDisabled?: boolean;
  pickList?: PickList | null;
};

export interface ScanOnlyConfig {
  enabled: boolean;
  matchedBin?: number | null;
  unmatchedBin?: number;
}

export interface EmptyAllBinLocation {
  binNumber: number;
  locationGuid: string;
}

export interface EmptyAllBinsOptions {
  collectionGuid?: string;
  locations?: EmptyAllBinLocation[];
}

export interface EmptyAllBinsInput extends EmptyAllBinsOptions {
  binNumbers: number[];
}
