import type { BrowserWindow } from "electron";
import path from "path";
import { APP_ICON_FILE, APP_USER_MODEL_ID, WINDOWS_APP_ICON_FILE } from "./constants/desktop";

export function appIconPath(): string {
  return path.join(__dirname, process.platform === "win32" ? WINDOWS_APP_ICON_FILE : APP_ICON_FILE);
}

export function applyTaskbarIcon(window: BrowserWindow) {
  if (process.platform !== "win32") return;
  window.setAppDetails({
    appId: APP_USER_MODEL_ID,
    appIconPath: appIconPath(),
    appIconIndex: 0,
  });
}
