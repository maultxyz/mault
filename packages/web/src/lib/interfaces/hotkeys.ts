import type { ReactNode } from "react";

export type HotkeyGroup = "general" | "navigation" | "scanner" | "cardDetail";

export type HotkeyId =
  | "showShortcuts"
  | "toggleSidebar"
  | "focusSearch"
  | "goScanner"
  | "goCollections"
  | "goMonitor"
  | "goStorage"
  | "goCalibrate"
  | "goSettings"
  | "goAdmin"
  | "scanPauseResume"
  | "scanNow"
  | "scanFeed"
  | "scanToggleAutoFeed"
  | "scanCycleFoil"
  | "scanPickSet"
  | "scanClearDevice"
  | "cardPrevious"
  | "cardNext"
  | "cardCorrect"
  | "cardClose"
  | "reviewStart"
  | "reviewAccept";

export interface HotkeyCombo {
  key: string;
  shift?: boolean;
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
