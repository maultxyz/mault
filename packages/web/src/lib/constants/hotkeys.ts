import type {
  HotkeyDefinition,
  HotkeyGroup,
  HotkeyId,
} from "@/lib/interfaces/hotkeys";
import { STORAGE_PATH } from "@/lib/constants/storage";

export const HOTKEY_SEQUENCE_TIMEOUT_MS = 1000;

export const HOTKEY_SEARCH_ATTRIBUTE = "data-hotkey-search";

export const HOTKEY_IGNORED_TARGET_SELECTOR =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="combobox"], [role="listbox"], [role="menu"], [role="slider"]';

export const HOTKEY_BLOCKING_OVERLAY_SELECTOR =
  '[role="dialog"], [role="alertdialog"]';

export const HOTKEY_KEY_LABEL_KEYS: Record<string, string> = {
  " ": "hotkeys.keys.space",
  arrowleft: "hotkeys.keys.left",
  arrowright: "hotkeys.keys.right",
  escape: "hotkeys.keys.escape",
};

export const HOTKEY_GROUP_ORDER: HotkeyGroup[] = [
  "general",
  "navigation",
  "scanner",
  "cardDetail",
];

export const HOTKEYS: Record<HotkeyId, HotkeyDefinition> = {
  showShortcuts: { group: "general", keys: [{ key: "?" }] },
  toggleSidebar: { group: "general", keys: [{ key: "[" }] },
  focusSearch: { group: "general", keys: [{ key: "/" }] },
  goScanner: { group: "navigation", keys: [{ key: "g" }, { key: "s" }] },
  goCollections: { group: "navigation", keys: [{ key: "g" }, { key: "c" }] },
  goMonitor: { group: "navigation", keys: [{ key: "g" }, { key: "m" }] },
  goStorage: { group: "navigation", keys: [{ key: "g" }, { key: "b" }] },
  goCalibrate: { group: "navigation", keys: [{ key: "g" }, { key: "d" }] },
  goSettings: { group: "navigation", keys: [{ key: "g" }, { key: "," }] },
  goAdmin: { group: "navigation", keys: [{ key: "g" }, { key: "a" }] },
  scanPauseResume: { group: "scanner", keys: [{ key: " " }] },
  scanNow: { group: "scanner", keys: [{ key: "s" }] },
  scanFeed: { group: "scanner", keys: [{ key: "f" }] },
  scanToggleAutoFeed: { group: "scanner", keys: [{ key: "a" }] },
  scanClearDevice: { group: "scanner", keys: [{ key: "c", shift: true }] },
  scanCycleFoil: { group: "scanner", keys: [{ key: "f", shift: true }] },
  scanPickSet: { group: "scanner", keys: [{ key: "s", shift: true }] },
  cardPrevious: { group: "cardDetail", keys: [{ key: "arrowleft" }] },
  cardNext: { group: "cardDetail", keys: [{ key: "arrowright" }] },
  cardCorrect: { group: "cardDetail", keys: [{ key: "c" }] },
  cardClose: { group: "cardDetail", keys: [{ key: "escape" }] },
};

export const HOTKEY_ROUTES = {
  goScanner: "/app",
  goCollections: "/app/collections",
  goMonitor: "/app/monitor",
  goStorage: STORAGE_PATH,
  goCalibrate: "/app/calibrate",
  goSettings: "/app/settings",
  goAdmin: "/app/admin",
} as const satisfies Partial<Record<HotkeyId, string>>;
