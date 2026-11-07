import type { BrowserWindow } from "electron";
import path from "path";
import { APP_USER_MODEL_ID, CHANNEL_SETTINGS } from "./channel";

export function appIconPath(): string {
  const extension = process.platform === "win32" ? "ico" : "png";
  return path.join(__dirname, `${CHANNEL_SETTINGS.iconBaseName}.${extension}`);
}

export function applyTaskbarIcon(window: BrowserWindow) {
  if (process.platform !== "win32" || !APP_USER_MODEL_ID) return;
  window.setAppDetails({
    appId: APP_USER_MODEL_ID,
    appIconPath: appIconPath(),
    appIconIndex: 0,
  });
}
