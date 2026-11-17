import type { ScanRoutingCard } from "./scan-routing.interface";
import type {
  BinCondition,
  BinConfig,
  BinRuleGroup,
  BinSet,
  FieldMeta,
} from "./sort-bins.interface";

export interface SortTestInput {
  card: ScanRoutingCard;
  binSet: BinSet | null | undefined;
  configs: BinConfig[];
  fieldDefinitions: FieldMeta[];
}

export type SortTestReason =
  | "rules"
  | "override"
  | "catchAllRules"
  | "noRuleMatched"
  | "overflow"
  | "pickList"
  | "autoAssign"
  | "scanOnly"
  | "chaos"
  | "alphabet"
  | "repack"
  | "noBin";

export interface SortTestConditionCheck {
  condition: BinCondition;
  passed: boolean;
  cardValue: unknown;
}

export interface SortTestGroupCheck {
  group: BinRuleGroup;
  passed: boolean;
  items: (SortTestConditionCheck | SortTestGroupCheck)[];
}

export interface SortTestBinCheck {
  binNumber: number;
  isCatchAll: boolean;
  isOverride: boolean;
  matched: boolean;
  check: SortTestGroupCheck;
}

export interface SortTestExplanation {
  binNumber: number | null;
  reason: SortTestReason;
  matchedBinNumber: number | null;
  alphabetLetter: string | null;
  pickListEntryName: string | null;
  binChecks: SortTestBinCheck[];
}
