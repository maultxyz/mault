import { app } from "electron";
import { autoUpdater } from "electron-updater";
import { UPDATE_CHECK_INTERVAL_MS } from "./constants/desktop";

export function startAutoUpdates() {
  if (!app.isPackaged) return;
  const check = () =>
    autoUpdater
      .checkForUpdatesAndNotify()
      .catch((err) => console.error("[desktop] update check failed:", err));
  void check();
  setInterval(check, UPDATE_CHECK_INTERVAL_MS);
}
