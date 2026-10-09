import type {
  AlphabetStep,
  BinCondition,
  BinConfig,
  BinRuleGroup,
  BinSet,
  DefaultBinInit,
  EmptyBinOptions,
  FieldMeta,
  RepackSlot,
} from "@magic-vault/shared";

export interface BinConfigSaveInput {
  binNumber: number;
  rules: BinRuleGroup;
  isCatchAll?: boolean;
  cardLimit?: number | null;
  isOverride?: boolean;
  overridePriority?: number | null;
  lowMatchPercent?: number | null;
  maxCopies?: number | null;
  isDisabled?: boolean;
}

export interface BinModeDraft {
  autoAssignField: string | null;
  scanOnly: boolean;
  isRepackMode: boolean;
  isAlphabetMode: boolean;
  isChaosMode: boolean;
  chaosBinSize: number | null;
}

export interface ChaosConfig {
  isChaosMode: boolean;
  chaosBinSize: number | null;
}

export interface AlphabetConfig {
  isAlphabetMode: boolean;
  alphabetPass: number;
  alphabetPrefix?: string;
}

export interface AlphabetPassState {
  isActive: boolean;
  prefix: string;
  nextStep: AlphabetStep | null;
  previousStep: AlphabetStep | null;
  pass: number;
  passCount: number;
  letters: Map<number, string>;
  from: string | undefined;
  to: string | undefined;
  isLastPass: boolean;
}

export interface AlphabetPassDialogProps {
  pending: AlphabetStep | null;
  onClose: () => void;
}

export interface BinConfigsContextValue {
  configs: BinConfig[];
  sets: BinSet[];
  fieldDefinitions: FieldMeta[];
  ruleFieldDefinitions: FieldMeta[];
  gameKey: string | null;
  hasGame: boolean;
  hasCollection: boolean;
  apiDocsUrl: string | null;
  isPending: boolean;
  isActivating: boolean;
  isPresetMutating: boolean;
  hasCatchAll: boolean;
  selectedBin: number;
  selectedSet?: BinSet;
  setSelectedBin: (bin: number) => void;
  setBinFormDirty: (dirty: boolean) => void;
  selectedConfig: BinConfig;
  save: (input: BinConfigSaveInput) => void;
  emptyBin: (binNumber: number, options?: EmptyBinOptions) => Promise<boolean>;
  activateSet: (guid: string) => Promise<void>;
  createSet: (name: string) => Promise<void>;
  importSet: (name: string, bins: DefaultBinInit[]) => Promise<boolean>;
  saveSet: (name: string) => Promise<void>;
  renameSet: (guid: string, name: string) => Promise<void>;
  deleteSet: (guid: string) => Promise<void>;
  setAutoAssignField: (field: string | null) => Promise<void>;
  resetAutoAssign: () => Promise<void>;
  setScanOnly: (enabled: boolean) => Promise<void>;
  setRepackConfig: (config: {
    isRepackMode: boolean;
    repackSlots: RepackSlot[];
    repackUniqueBy: string | null;
    repackSiftRules: BinRuleGroup | null;
  }) => Promise<boolean>;
  setAlphabetPass: (step: AlphabetStep) => Promise<void>;
  effectiveMode: BinModeDraft;
  isModeDirty: boolean;
  isSavingMode: boolean;
  stageMode: (patch: Partial<BinModeDraft>) => void;
  saveMode: () => Promise<void>;
  discardMode: () => void;
}

export interface BinCardProps {
  config: BinConfig;
  active?: boolean;
  isAutoAssign?: boolean;
  isScanOnly?: boolean;
  isChaosMode?: boolean;
  alphabetLetter?: string | null;
  disabled?: boolean;
  onClick: () => void;
}

export interface ConditionRowProps {
  condition: BinCondition;
  onChange: (updated: BinCondition) => void;
  onRemove: () => void;
}

export interface PresetSelectorProps {
  readOnly?: boolean;
}

export interface RuleGroupEditorProps {
  group: BinRuleGroup;
  onChange: (updated: BinRuleGroup) => void;
  onRemove?: () => void;
  depth?: number;
}

export interface BinRulesMenuProps {
  className?: string;
}

export interface BinLocationDiagramProps {
  binNumber?: number;
  inverted?: boolean;
}
