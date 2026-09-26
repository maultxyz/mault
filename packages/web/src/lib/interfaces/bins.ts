import type {
  BinCondition,
  BinConfig,
  BinRuleGroup,
  BinSet,
  DefaultBinInit,
  FieldMeta,
  RepackSlot,
} from "@magic-vault/shared";

export interface BinModeDraft {
  autoAssignField: string | null;
  scanOnly: boolean;
  isRepackMode: boolean;
}

export interface BinConfigsContextValue {
  configs: BinConfig[];
  sets: BinSet[];
  fieldDefinitions: FieldMeta[];
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
  save: (
    binNumber: number,
    rules: BinRuleGroup,
    isCatchAll?: boolean,
    cardLimit?: number | null,
    isOverride?: boolean,
  ) => void;
  emptyBin: (binNumber: number) => Promise<void>;
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
    repackAllowDuplicates: boolean;
  }) => Promise<void>;
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
