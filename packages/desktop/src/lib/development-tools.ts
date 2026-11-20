import { app, type BrowserWindow, type Input } from "electron";
import { appendFile } from "fs/promises";
import path from "path";
import { DEVELOPMENT_CONSOLE_LOG_FILE_NAME } from "./constants/desktop";

function isDevToolsShortcut(input: Input): boolean {
  if (input.type !== "keyDown") return false;
  if (input.key === "F12") return true;
  return input.control && input.shift && input.key.toLowerCase() === "i";
}

function developmentConsoleLogPath(): string {
  return path.join(app.getPath("temp"), DEVELOPMENT_CONSOLE_LOG_FILE_NAME);
}

export function registerDevelopmentTools(window: BrowserWindow) {
  if (app.isPackaged) return;
  window.webContents.on("before-input-event", (event, input) => {
    if (!isDevToolsShortcut(input)) return;
    event.preventDefault();
    window.webContents.toggleDevTools();
  });
  const consoleLogPath = developmentConsoleLogPath();
  window.webContents.on("console-message", (details) => {
    const line = `${new Date().toISOString()} [${details.level}] ${details.message}\n`;
    void appendFile(consoleLogPath, line).catch(() => {});
  });
}
