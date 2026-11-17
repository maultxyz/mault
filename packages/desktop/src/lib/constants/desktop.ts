import type {
  DesktopLocale,
  DesktopStrings,
} from "../interfaces/desktop";

export const PRODUCTION_APP_URL = "https://mault.xyz";
export const DEVELOPMENT_APP_URL = "http://localhost:5173";
export const APP_URL_ENV = "MAULT_URL";
export const START_PATH = "/app";

export const MAIN_WINDOW_SIZE = { width: 1440, height: 900 };
export const MAIN_WINDOW_MIN_SIZE = { width: 960, height: 640 };
export const PICKER_WINDOW_SIZE = { width: 420, height: 380 };
export const WINDOW_BACKGROUND = { light: "#ffffff", dark: "#1e1f21" };

export const GRANTED_SERIAL_PORTS_FILE = "granted-serial-ports.json";

export const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export const ABORTED_LOAD_ERROR_CODE = -3;

export const PICKER_CHANNELS = {
  ready: "picker:ready",
  choose: "picker:choose",
  state: "picker:state",
} as const;

export const SCANNER_CHANNELS = {
  buttons: "scanner:buttons",
  command: "scanner:command",
} as const;

export const NOTIFICATION_CHANNEL = "desktop:notify";

export const WINDOW_STATE_CHANNELS = {
  get: "window:get-state",
  state: "window:state",
  showMain: "window:show-main",
  movePip: "window:move-pip",
} as const;

export const OCCLUSION_PROBE_HIDDEN = "hidden";
export const OCCLUSION_PROBE_URL = `data:text/html,${encodeURIComponent(
  "<script>const update=()=>{document.title=document.visibilityState};document.addEventListener('visibilitychange',update);update()</script>",
)}`;

export const COVERAGE_POLL_MS = 500;
export const COVERAGE_BACKGROUND_RATIO = 0.5;
export const COVERAGE_SAMPLE_GRID = 16;
export const COVERAGE_MAX_WINDOWS = 500;
export const WIN32 = {
  GW_HWNDPREV: 3,
  GWL_EXSTYLE: -20,
  WS_EX_TRANSPARENT: 0x20,
  WS_EX_TOOLWINDOW: 0x80,
  WS_EX_NOACTIVATE: 0x08000000,
  DWMWA_EXTENDED_FRAME_BOUNDS: 9,
  DWMWA_CLOAKED: 14,
} as const;

export const PIP_WINDOW_SIZE = { width: 220, height: 400 };
export const PIP_WINDOW_MIN_SIZE = { width: 160, height: 240 };
export const PIP_WINDOW_MARGIN = 24;
export const APP_USER_MODEL_ID = "xyz.mault.desktop";
export const MAX_NOTIFICATION_TITLE_LENGTH = 200;
export const MAX_NOTIFICATION_BODY_LENGTH = 1000;
export const NOTIFICATION_DEDUPE_MS = 10_000;

export const MAX_THUMBAR_BUTTONS = 7;
export const MAX_THUMBAR_TOOLTIP_LENGTH = 260;

export const THUMBAR_READY_DELAY_MS = 1000;

export const ALLOWED_PERMISSIONS = new Set<string>([
  "media",
  "serial",
  "clipboard-read",
  "clipboard-sanitized-write",
  "fullscreen",
  "notifications",
  "screen-wake-lock",
]);

export const EXTERNAL_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

export const ELECTRON_USER_AGENT_TOKENS = /\s(Electron|MAULT|@magic-vault\/desktop)\/\S+/g;

export const DEFAULT_LOCALE: DesktopLocale = "en";

export const DESKTOP_STRINGS: Record<DesktopLocale, DesktopStrings> = {
  en: {
    serialTitle: "Select a sorter port",
    bluetoothTitle: "Select a sorter",
    searching: "Searching for devices...",
    connect: "Connect",
    cancel: "Cancel",
    offlineTitle: "Can't reach MAULT",
    offlineBody: "Check your internet connection and try again.",
    retry: "Retry",
  },
  de: {
    serialTitle: "Sorter-Anschluss auswÃ¤hlen",
    bluetoothTitle: "Sorter auswÃ¤hlen",
    searching: "Suche nach GerÃ¤ten...",
    connect: "Verbinden",
    cancel: "Abbrechen",
    offlineTitle: "MAULT ist nicht erreichbar",
    offlineBody: "PrÃ¼fe deine Internetverbindung und versuche es erneut.",
    retry: "Erneut versuchen",
  },
  fr: {
    serialTitle: "Choisir le port du trieur",
    bluetoothTitle: "Choisir un trieur",
    searching: "Recherche d'appareils...",
    connect: "Connecter",
    cancel: "Annuler",
    offlineTitle: "Impossible de joindre MAULT",
    offlineBody: "VÃ©rifiez votre connexion Internet et rÃ©essayez.",
    retry: "RÃ©essayer",
  },
};
