import {
  DESKTOP_SCANNER_COMMANDS,
  DESKTOP_SCANNER_ICONS,
  type DesktopScannerButton,
} from "@magic-vault/shared";
import {
  BrowserWindow,
  ipcMain,
  nativeImage,
  nativeTheme,
  type WebContents,
} from "electron";
import path from "path";
import { isAppOrigin } from "./app-url";
import {
  MAX_THUMBAR_BUTTONS,
  MAX_THUMBAR_TOOLTIP_LENGTH,
  SCANNER_CHANNELS,
  THUMBAR_READY_DELAY_MS,
} from "./constants/desktop";

const scannerButtons = new Map<number, DesktopScannerButton[]>();
const readyWindows = new Set<number>();

function icon(name: DesktopScannerButton["icon"]) {
  const theme = nativeTheme.shouldUseDarkColorsForSystemIntegratedUI ? "dark" : "light";
  return nativeImage.createFromPath(path.join(__dirname, `thumbar-${name}-${theme}.png`));
}

function isScannerButton(value: unknown): value is DesktopScannerButton {
  if (!value || typeof value !== "object") return false;
  const button = value as Record<string, unknown>;
  return (
    DESKTOP_SCANNER_COMMANDS.includes(button.command as DesktopScannerButton["command"]) &&
    DESKTOP_SCANNER_ICONS.includes(button.icon as DesktopScannerButton["icon"]) &&
    typeof button.tooltip === "string" &&
    button.tooltip.length <= MAX_THUMBAR_TOOLTIP_LENGTH &&
    (button.disabled === undefined || typeof button.disabled === "boolean")
  );
}

function parseButtons(value: unknown): DesktopScannerButton[] {
  if (!Array.isArray(value) || value.length > MAX_THUMBAR_BUTTONS) return [];
  return value.every(isScannerButton) ? value : [];
}

function render(window: BrowserWindow) {
  if (window.isDestroyed() || !readyWindows.has(window.id)) return;
  const { webContents } = window;
  const buttons = scannerButtons.get(webContents.id) ?? [];
  window.setThumbarButtons(
    buttons.map((button) => ({
      tooltip: button.tooltip,
      icon: icon(button.icon),
      ...(button.disabled ? { flags: ["disabled"] } : {}),
      click: () => {
        if (!webContents.isDestroyed()) {
          webContents.send(SCANNER_CHANNELS.command, button.command);
        }
      },
    })),
  );
}

function setButtons(webContents: WebContents, buttons: DesktopScannerButton[]) {
  if (buttons.length > 0) scannerButtons.set(webContents.id, buttons);
  else scannerButtons.delete(webContents.id);
  const window = BrowserWindow.fromWebContents(webContents);
  if (window) render(window);
}

export function registerScannerThumbar() {
  if (process.platform !== "win32") return;
  ipcMain.on(SCANNER_CHANNELS.buttons, (event, value: unknown) => {
    if (!isAppOrigin(event.senderFrame?.origin)) return;
    setButtons(event.sender, parseButtons(value));
  });
  nativeTheme.on("updated", () => {
    for (const window of BrowserWindow.getAllWindows()) render(window);
  });
}

export function trackScannerThumbar(window: BrowserWindow) {
  if (process.platform !== "win32") return;
  const { webContents } = window;
  const windowId = window.id;
  const contentsId = webContents.id;
  window.once("show", () => {
    setTimeout(() => {
      readyWindows.add(windowId);
      render(window);
    }, THUMBAR_READY_DELAY_MS);
  });
  webContents.on("did-start-navigation", (details) => {
    if (details.isMainFrame && !details.isSameDocument) setButtons(webContents, []);
  });
  window.once("closed", () => {
    readyWindows.delete(windowId);
    scannerButtons.delete(contentsId);
  });
}
