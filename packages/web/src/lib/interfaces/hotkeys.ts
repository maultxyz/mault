import type { ReactNode } from "react";

export type HotkeyGroup =
  | "general"
  | "navigation"
  | "scanner"
  | "cardDetail"
  | "intake"
  | "foilLabeling";

export type HotkeyId =
  | "showShortcuts"
  | "toggleSidebar"
  | "focusSearch"
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
  | "scanPauseResume"
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
  | "foilLabelFoil"
  | "foilLabelNotFoil"
  | "foilLabelSkip"
  | "foilLabelBack";

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
}

export interface KbdProps {
  children: ReactNode;
  className?: string;
}
