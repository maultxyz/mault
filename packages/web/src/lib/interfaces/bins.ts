import type {
  BinCondition,
  BinConfig,
  BinRuleGroup,
  BinSet,
  FieldMeta,
} from "@magic-vault/shared";

export interface BinConfigsContextValue {
  configs: BinConfig[];
  sets: BinSet[];
  fieldDefinitions: FieldMeta[];
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
  selectedConfig: BinConfig;
  save: (binNumber: number, rules: BinRuleGroup, isCatchAll?: boolean) => void;
  clear: (binNumber: number) => void;
  activateSet: (guid: string) => Promise<void>;
  createSet: (name: string) => Promise<void>;
  saveSet: (name: string) => Promise<void>;
  renameSet: (guid: string, name: string) => Promise<void>;
  deleteSet: (guid: string) => Promise<void>;
  setAutoAssignField: (field: string | null) => Promise<void>;
  resetAutoAssign: () => Promise<void>;
  setScanOnly: (enabled: boolean) => Promise<void>;
}

export interface BinCardProps {
  config: BinConfig;
  active?: boolean;
  isAutoAssign?: boolean;
  isScanOnly?: boolean;
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
