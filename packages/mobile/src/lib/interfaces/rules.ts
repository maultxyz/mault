import type {
  AlphabetStep,
  BinCondition,
  BinConfig,
  BinRuleGroup,
  BinSet,
  Collection,
  FieldMeta,
  PresetWorkflow,
  PresetWorkflowStep,
  RepackSlot,
} from "@magic-vault/shared";

export interface BinSaveInput {
  binNumber: number;
  gameGuid?: string;
  rules: BinRuleGroup;
  isCatchAll: boolean;
  isDisabled: boolean;
  overflowBin: number | null;
  isOverride?: boolean;
  overridePriority?: number | null;
  lowMatchPercent?: number | null;
  maxCopies?: number | null;
  maxCopiesBy?: string | null;
}


export type ModePicker = "matched" | "unmatched" | "field";

export interface RepackConfigInput {
  isRepackMode: boolean;
  repackSlots: RepackSlot[];
  repackUniqueBy: string | null;
  repackSiftRules: BinRuleGroup | null;
  repackMultiplePacks?: boolean;
}

export interface AlphabetConfigInput extends AlphabetStep {
  isAlphabetMode: boolean;
}

export interface ChaosConfigInput {
  isChaosMode: boolean;
  chaosBinSize: number | null;
}

export interface PresetStageMoves {
  moveTo: (workflow: PresetWorkflow, step: PresetWorkflowStep, name: string) => void;
  start: (workflow: PresetWorkflow, step: PresetWorkflowStep) => void;
  isPending: boolean;
  isError: boolean;
}

export interface ActivePresetWorkflowState {
  workflows: PresetWorkflow[];
  workflow: PresetWorkflow | null;
  step: PresetWorkflowStep | null;
  stageNumber: number;
  stageCount: number;
  previousStep: PresetWorkflowStep | null;
  nextStep: PresetWorkflowStep | null;
  label: string;
  presetName: (presetGuid: string) => string;
}

export interface AlphabetPassCardProps {
  set: BinSet;
  bins: BinConfig[];
}

export interface RuleGroupEditorProps {
  group: BinRuleGroup;
  onChange: (group: BinRuleGroup) => void;
  onRemove?: () => void;
  depth?: number;
  fieldDefinitions: FieldMeta[];
  freeformOptions: boolean;
  disabled?: boolean;
}

export interface RulesData {
  collection: Collection | null;
  gameGuid: string | undefined;
  sets: BinSet[];
  activeSet: BinSet | undefined;
  bins: BinConfig[];
  fieldDefinitions: FieldMeta[];
  freeformOptions: boolean;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
  isRefetching: boolean;
}

export type ConditionSheetStep = "field" | "details";

export interface ConditionSheetProps {
  condition: BinCondition | null;
  isNew: boolean;
  fieldDefinitions: FieldMeta[];
  freeformOptions: boolean;
  onSave: (condition: BinCondition) => void;
  onRemove?: () => void;
  onClose: () => void;
}

export interface ConditionRowProps {
  condition: BinCondition;
  fieldDefinitions: FieldMeta[];
  disabled?: boolean;
  onPress: () => void;
}

export interface ConditionDescription {
  field: string;
  predicate: string;
}

export type ConditionEditTarget = { kind: "edit"; index: number } | { kind: "new" };

export interface BinRowProps {
  bin: BinConfig;
  bins: BinConfig[];
  fieldDefinitions: FieldMeta[];
  summary?: string;
  onPress: () => void;
}
