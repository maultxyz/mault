import type { BinSetMode } from "@magic-vault/shared";

export const SORTING_RULES_PATH = "/app/rules";
export const SORTING_RULES_PRESET_PARAM = "preset";
export const sortingRulesPresetPath = (presetGuid: string) =>
  `${SORTING_RULES_PATH}?${SORTING_RULES_PRESET_PARAM}=${encodeURIComponent(presetGuid)}`;
export const PRESET_WORKFLOW_PATH = "/app/rules/multi-stage/:workflowGuid";
export const presetWorkflowPath = (workflowGuid: string) =>
  `/app/rules/multi-stage/${workflowGuid}`;
export const PRESET_KINDS = ["rules", "multiStage"] as const;
export const BIN_RULE_TRANSFER_MODES = ["copy", "move"] as const;
export const CREATE_PRESET_DEFAULT_VALUES = {
  name: "",
  kind: "rules" as const,
  firstPresetGuid: "",
};

export const CONDITION_INPUT_CLASS = "max-md:h-10";

export const CONDITION_FIELD_CLASS = "max-md:basis-full";

export const CONDITION_SELECT_TRIGGER_CLASS =
  "max-md:data-[size=default]:h-10 max-md:px-3 max-md:font-normal";

export const DEFAULT_MAX_COPIES = 4;

export const BIN_RULES_EXPORT_FORMAT_VERSION = 3;
export const BIN_RULES_EXPORT_CATCH_ALL_RULES_SINCE = 2;
export const BIN_RULES_EXPORT_LOW_MATCH_COLUMN_SINCE = 3;
export const DEFAULT_CATCH_ALL_MATCH_PERCENT = 80;

export const REPACK_ALLOW_DUPLICATES_VALUE = "$allow";

export const NO_OVERFLOW_VALUE = "$none";
export const REPACK_PRIORITY_AUTO_VALUE = "$auto";

export const PICK_LIST_DECKLIST_MAX_LENGTH = 50000;

export const BIN_SETTINGS_LIST_CLASS =
  "flex flex-col divide-y rounded-lg border";

export const MOBILE_BINS_SCREEN_PARAM = "screen";
export const MOBILE_BINS_BIN_PARAM = "bin";

export const SORTING_MODE_OPTIONS: BinSetMode[] = [
  "rules",
  "scan-only",
  "auto-assign",
  "game-sort",
  "repack",
  "alphabet",
  "chaos",
];

export const SORTING_MODE_LABEL_KEYS: Record<BinSetMode, string> = {
  rules: "sortingModePanel.rules.heading",
  "scan-only": "scanOnlyPanel.heading",
  "auto-assign": "autoAssignPanel.heading",
  "game-sort": "gameSortPanel.heading",
  repack: "repackPanel.heading",
  alphabet: "alphabetPanel.heading",
  chaos: "chaosPanel.heading",
};

export const SORTING_MODE_DESCRIPTION_KEYS: Record<BinSetMode, string> = {
  rules: "sortingModePanel.rules.description",
  "scan-only": "scanOnlyPanel.description",
  "auto-assign": "autoAssignPanel.description",
  "game-sort": "gameSortPanel.description",
  repack: "repackPanel.description",
  alphabet: "alphabetPanel.description",
  chaos: "chaosPanel.description",
};

export const SORTING_MODE_SUMMARY_KEYS: Record<BinSetMode, string> = {
  rules: "sortingModePanel.summaries.rules",
  "scan-only": "sortingModePanel.summaries.scan-only",
  "auto-assign": "sortingModePanel.summaries.auto-assign",
  "game-sort": "sortingModePanel.summaries.game-sort",
  repack: "sortingModePanel.summaries.repack",
  alphabet: "sortingModePanel.summaries.alphabet",
  chaos: "sortingModePanel.summaries.chaos",
};

export const SORTING_MODE_SELECT_ID = "sorting-mode";
export const SORTING_MODE_DESCRIPTION_ID = "sorting-mode-description";
export const SORTING_MODE_SUMMARY_ID = "sorting-mode-summary";
export const AUTO_ASSIGN_FIELD_SELECT_ID = "auto-assign-field";
export const RESET_AUTO_ASSIGN_HINT_ID = "reset-auto-assign-hint";
