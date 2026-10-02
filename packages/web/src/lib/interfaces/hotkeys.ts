import type { ReactNode } from "react";

export type HotkeyGroup = "general" | "navigation" | "scanner";

export type HotkeyId =
  | "showShortcuts"
  | "toggleSidebar"
  | "focusSearch"
  | "goScanner"
  | "goCollections"
  | "goMonitor"
  | "goCalibrate"
  | "goSettings"
  | "goAdmin"
  | "scanPauseResume"
  | "scanNow"
  | "scanFeed"
  | "scanToggleAutoFeed"
  | "scanCycleFoil"
  | "scanPickSet"
  | "scanClearDevice";

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
}

export interface HotkeyHintProps {
  id: HotkeyId;
  className?: string;
}

export interface KbdProps {
  children: ReactNode;
  className?: string;
}
