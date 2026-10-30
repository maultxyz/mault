import type { BrowserWindow } from "electron";
import path from "path";
import { CHANNEL_SETTINGS } from "./channel";

export function appIconPath(): string {
  const extension = process.platform === "win32" ? "ico" : "png";
  return path.join(__dirname, `${CHANNEL_SETTINGS.iconBaseName}.${extension}`);
}

export function applyTaskbarIcon(window: BrowserWindow) {
  if (process.platform !== "win32") return;
  window.setAppDetails({
    appId: CHANNEL_SETTINGS.appUserModelId,
    appIconPath: appIconPath(),
    appIconIndex: 0,
  });
}
