import { app, BrowserWindow, nativeTheme, session } from "electron";
import path from "path";
import { appIconPath, applyTaskbarIcon } from "./lib/app-icon";
import { getStartUrl } from "./lib/app-url";
import {
  APP_USER_MODEL_ID,
  ELECTRON_USER_AGENT_TOKENS,
  MAIN_WINDOW_MIN_SIZE,
  MAIN_WINDOW_SIZE,
  WINDOW_BACKGROUND,
} from "./lib/constants/desktop";
import { loadDevelopmentEnv } from "./lib/development-env";
import { registerDevicePickerIpc } from "./lib/device-picker";
import { registerDocumentScanIpc } from "./lib/document-scan";
import { registerBluetoothPicker, registerSerialPicker } from "./lib/devices";
import { registerNavigation } from "./lib/navigation";
import { registerDesktopNotifications } from "./lib/notifications";
import { registerPermissionHandlers } from "./lib/permissions";
import { registerScannerThumbar, trackScannerThumbar } from "./lib/thumbar";
import { startAutoUpdates } from "./lib/updater";
import { registerWindowStateIpc, trackWindowState } from "./lib/window-state";

loadDevelopmentEnv();

let mainWindow: BrowserWindow | null = null;

function createMainWindow() {
  const window = new BrowserWindow({
    ...MAIN_WINDOW_SIZE,
    minWidth: MAIN_WINDOW_MIN_SIZE.width,
    minHeight: MAIN_WINDOW_MIN_SIZE.height,
    title: "MAULT",
    icon: appIconPath(),
    show: false,
    autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors
      ? WINDOW_BACKGROUND.dark
      : WINDOW_BACKGROUND.light,
    webPreferences: {
      preload: path.join(__dirname, "main-preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  applyTaskbarIcon(window);
  window.once("ready-to-show", () => window.show());
  window.on("closed", () => {
    if (mainWindow === window) mainWindow = null;
  });
  trackScannerThumbar(window);
  trackWindowState(window);
  void window.loadURL(getStartUrl());
  mainWindow = window;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.userAgentFallback = app.userAgentFallback.replace(ELECTRON_USER_AGENT_TOKENS, "");
  if (process.platform === "win32") app.setAppUserModelId(APP_USER_MODEL_ID);

  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.on("web-contents-created", (_event, contents) => {
    if (contents.getType() !== "window") return;
    registerNavigation(contents);
    registerBluetoothPicker(contents);
  });

  void app.whenReady().then(() => {
    registerPermissionHandlers(session.defaultSession);
    registerSerialPicker(session.defaultSession);
    registerDevicePickerIpc();
    registerScannerThumbar();
    registerDesktopNotifications();
    registerWindowStateIpc();
    registerDocumentScanIpc();
    createMainWindow();
    startAutoUpdates();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
