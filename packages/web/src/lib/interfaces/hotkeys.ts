import type { ReactNode } from "react";

export type HotkeyGroup =
  | "general"
  | "navigation"
  | "scanner"
  | "cardDetail"
  | "intake"
  | "matchValidation";

export type HotkeyId =
  | "showShortcuts"
  | "toggleSidebar"
  | "focusSearch"
  | "openGlobalSearch"
  | "dismissToasts"
  | "clearSelection"
  | "save"
  | "goScanner"
  | "goCollections"
  | "goSortingRules"
  | "goStorage"
  | "goCalibrate"
  | "goSettings"
  | "goAdmin"
  | "goNextSorterNeedingAttention"
  | "scanPauseResume"
  | "scanEmergencyStop"
  | "scanNow"
  | "scanFeed"
  | "scanFlatbedCard"
  | "scanToggleAutoFeed"
  | "scanCycleFoil"
  | "scanPickSet"
  | "scanClearDevice"
  | "cardPrevious"
  | "cardNext"
  | "cardCorrect"
  | "cardToggleFoil"
  | "cardConditionNM"
  | "cardConditionLP"
  | "cardConditionMP"
  | "cardConditionHP"
  | "cardConditionDMG"
  | "cardClose"
  | "cardRemove"
  | "reviewStart"
  | "reviewAccept"
  | "reviewPreviousMatch"
  | "reviewNextMatch"
  | "reviewCycleFoil"
  | "reviewCycleCondition"
  | "reviewCycleLanguage"
  | "intakeOpenScanner"
  | "matchValidationCorrect"
  | "matchValidationIncorrect"
  | "matchValidationBadScan"
  | "matchValidationSkip"
  | "matchValidationBack";

export interface HotkeyCombo {
  key: string;
  shift?: boolean;
  mod?: boolean;
}

export interface HotkeyDefinition {
  group: HotkeyGroup;
  keys: HotkeyCombo[];
}

export type HotkeyHandlers = Partial<Record<HotkeyId, () => void>>;

export interface HotkeyRegistration {
  getHandlers: () => HotkeyHandlers;
  isEnabled: () => boolean;
  priority: number;
}

export interface HotkeyHintProps {
  id: HotkeyId;
  className?: string;
  showWhenInactive?: boolean;
}

export interface KbdProps {
  children: ReactNode;
  className?: string;
}
