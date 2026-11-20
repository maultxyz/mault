import { app, type BrowserWindow, type Input } from "electron";

function isDevToolsShortcut(input: Input): boolean {
  if (input.type !== "keyDown") return false;
  if (input.key === "F12") return true;
  return input.control && input.shift && input.key.toLowerCase() === "i";
}

export function registerDevelopmentTools(window: BrowserWindow) {
  if (app.isPackaged) return;
  window.webContents.on("before-input-event", (event, input) => {
    if (!isDevToolsShortcut(input)) return;
    event.preventDefault();
    window.webContents.toggleDevTools();
  });
}
