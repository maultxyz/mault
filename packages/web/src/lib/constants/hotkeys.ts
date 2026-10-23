import { SORTING_RULES_PATH } from "@/lib/constants/bins";
import type {
  HotkeyDefinition,
  HotkeyGroup,
  HotkeyId,
} from "@/lib/interfaces/hotkeys";
import { STORAGE_PATH } from "@/lib/constants/storage";

export const HOTKEY_SEQUENCE_TIMEOUT_MS = 1000;

export const HOTKEY_PRIORITY_OVERRIDE = 1;

export const HOTKEY_SEARCH_ATTRIBUTE = "data-hotkey-search";

export const HOTKEY_IGNORED_TARGET_SELECTOR =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="combobox"], [role="listbox"], [role="menu"], [role="slider"]';

export const HOTKEY_BLOCKING_OVERLAY_SELECTOR =
  '[role="dialog"], [role="alertdialog"]';

export const HOTKEY_KEY_LABEL_KEYS: Record<string, string> = {
  " ": "hotkeys.keys.space",
  enter: "hotkeys.keys.enter",
  arrowleft: "hotkeys.keys.left",
  arrowright: "hotkeys.keys.right",
  escape: "hotkeys.keys.escape",
  delete: "hotkeys.keys.delete",
};

export const HOTKEY_GROUP_ORDER: HotkeyGroup[] = [
  "general",
  "navigation",
  "scanner",
  "cardDetail",
  "intake",
];

export const HOTKEYS: Record<HotkeyId, HotkeyDefinition> = {
  showShortcuts: { group: "general", keys: [{ key: "?" }] },
  toggleSidebar: { group: "general", keys: [{ key: "[" }] },
  focusSearch: { group: "general", keys: [{ key: "/" }] },
  dismissToasts: { group: "general", keys: [{ key: "x", shift: true }] },
  goScanner: { group: "navigation", keys: [{ key: "g" }, { key: "s" }] },
  goCollections: { group: "navigation", keys: [{ key: "g" }, { key: "c" }] },
  goSortingRules: {
    group: "navigation",
    keys: [{ key: "g" }, { key: "r" }],
  },
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
  cardToggleFoil: { group: "cardDetail", keys: [{ key: "f" }] },
  cardConditionNM: { group: "cardDetail", keys: [{ key: "1" }] },
  cardConditionLP: { group: "cardDetail", keys: [{ key: "2" }] },
  cardConditionMP: { group: "cardDetail", keys: [{ key: "3" }] },
  cardConditionHP: { group: "cardDetail", keys: [{ key: "4" }] },
  cardConditionDMG: { group: "cardDetail", keys: [{ key: "5" }] },
  cardClose: { group: "cardDetail", keys: [{ key: "escape" }] },
  cardRemove: { group: "cardDetail", keys: [{ key: "delete" }] },
  reviewStart: { group: "cardDetail", keys: [{ key: "r" }] },
  reviewAccept: { group: "cardDetail", keys: [{ key: "enter" }] },
  intakeOpenScanner: { group: "intake", keys: [{ key: "o" }] },
};

export const HOTKEY_ROUTES = {
  goScanner: "/app",
  goCollections: "/app/collections",
  goSortingRules: SORTING_RULES_PATH,
  goStorage: STORAGE_PATH,
  goCalibrate: "/app/calibrate",
  goSettings: "/app/settings",
  goAdmin: "/app/admin",
} as const satisfies Partial<Record<HotkeyId, string>>;
