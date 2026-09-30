import type {
  HotkeyDefinition,
  HotkeyGroup,
  HotkeyId,
} from "@/lib/interfaces/hotkeys";

export const HOTKEY_SEQUENCE_TIMEOUT_MS = 1000;

export const HOTKEY_SEARCH_ATTRIBUTE = "data-hotkey-search";

export const HOTKEY_IGNORED_TARGET_SELECTOR =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="combobox"], [role="listbox"], [role="menu"], [role="slider"]';

export const HOTKEY_BLOCKING_OVERLAY_SELECTOR =
  '[role="dialog"], [role="alertdialog"]';

export const HOTKEY_KEY_LABEL_KEYS: Record<string, string> = {
  " ": "hotkeys.keys.space",
};

export const HOTKEY_GROUP_ORDER: HotkeyGroup[] = [
  "general",
  "navigation",
  "scanner",
];

export const HOTKEYS: Record<HotkeyId, HotkeyDefinition> = {
  showShortcuts: { group: "general", keys: [{ key: "?" }] },
  toggleSidebar: { group: "general", keys: [{ key: "[" }] },
  focusSearch: { group: "general", keys: [{ key: "/" }] },
  goScanner: { group: "navigation", keys: [{ key: "g" }, { key: "s" }] },
  goCollections: { group: "navigation", keys: [{ key: "g" }, { key: "c" }] },
  goMonitor: { group: "navigation", keys: [{ key: "g" }, { key: "m" }] },
  goCalibrate: { group: "navigation", keys: [{ key: "g" }, { key: "d" }] },
  goSettings: { group: "navigation", keys: [{ key: "g" }, { key: "," }] },
  goAdmin: { group: "navigation", keys: [{ key: "g" }, { key: "a" }] },
  scanPauseResume: { group: "scanner", keys: [{ key: " " }] },
  scanNow: { group: "scanner", keys: [{ key: "s" }] },
  scanFeed: { group: "scanner", keys: [{ key: "f" }] },
  scanToggleAutoFeed: { group: "scanner", keys: [{ key: "a" }] },
  scanCycleFoil: { group: "scanner", keys: [{ key: "f", shift: true }] },
  scanClearDevice: { group: "scanner", keys: [{ key: "c", shift: true }] },
};

export const HOTKEY_ROUTES = {
  goScanner: "/app",
  goCollections: "/app/collections",
  goMonitor: "/app/monitor",
  goCalibrate: "/app/calibrate",
  goSettings: "/app/settings",
  goAdmin: "/app/admin",
} as const satisfies Partial<Record<HotkeyId, string>>;
