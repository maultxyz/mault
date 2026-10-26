import type { DesktopWindowOffset, DesktopWindowState } from "@magic-vault/shared";
import {
  BrowserWindow,
  ipcMain,
  screen,
  WebContentsView,
  type BrowserWindowConstructorOptions,
  type WebContents,
} from "electron";
import { isAppOrigin } from "./app-url";
import { coveredRatio } from "./window-coverage";
import {
  COVERAGE_BACKGROUND_RATIO,
  COVERAGE_POLL_MS,
  OCCLUSION_PROBE_HIDDEN,
  OCCLUSION_PROBE_URL,
  PIP_WINDOW_MARGIN,
  PIP_WINDOW_MIN_SIZE,
  PIP_WINDOW_SIZE,
  WINDOW_STATE_CHANNELS,
} from "./constants/desktop";

const occludedWindows = new WeakSet<BrowserWindow>();
const coveredWindows = new WeakSet<BrowserWindow>();
const pipWindows = new Map<number, BrowserWindow>();

function stateOf(window: BrowserWindow): DesktopWindowState {
  return {
    background: !window.isVisible() || window.isMinimized() ||
      occludedWindows.has(window) ||
      coveredWindows.has(window),
  };
}

function isWindowOffset(value: unknown): value is DesktopWindowOffset {
  if (!value || typeof value !== "object") return false;
  const { x, y } = value as Record<string, unknown>;
  return typeof x === "number" && Number.isFinite(x) && typeof y === "number" && Number.isFinite(y);
}

function trackOcclusion(window: BrowserWindow, onChange: () => void) {
  const probe = new WebContentsView();
  probe.setBackgroundColor("#00000000");
  probe.setBounds({ x: 0, y: 0, width: 1, height: 1 });
  window.contentView.addChildView(probe);
  probe.webContents.on("page-title-updated", (_event, title) => {
    if (title === OCCLUSION_PROBE_HIDDEN) occludedWindows.add(window);
    else occludedWindows.delete(window);
    onChange();
  });
  void probe.webContents.loadURL(OCCLUSION_PROBE_URL);
  window.on("closed", () => probe.webContents.close());
}

function trackCoverage(window: BrowserWindow, onChange: () => void) {
  if (process.platform !== "win32") return;
  const update = () => {
    if (window.isDestroyed()) return;
    const covered =
      window.isVisible() &&
      !window.isFocused() &&
      coveredRatio(window.getNativeWindowHandle()) >= COVERAGE_BACKGROUND_RATIO;
    if (covered === coveredWindows.has(window)) return;
    if (covered) coveredWindows.add(window);
    else coveredWindows.delete(window);
    onChange();
  };
  const timer = setInterval(update, COVERAGE_POLL_MS);
  window.on("focus", update);
  window.on("closed", () => clearInterval(timer));
}

export function trackPipWindow(opener: WebContents, pip: BrowserWindow) {
  const id = opener.id;
  pipWindows.set(id, pip);
  pip.on("closed", () => {
    if (pipWindows.get(id) === pip) pipWindows.delete(id);
  });
}

export function bringToFront(window: BrowserWindow) {
  if (window.isDestroyed()) return;
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}

export function trackWindowState(window: BrowserWindow) {
  const send = () => {
    if (!window.isDestroyed()) {
      window.webContents.send(WINDOW_STATE_CHANNELS.state, stateOf(window));
    }
  };
  trackOcclusion(window, send);
  trackCoverage(window, send);
  window.on("minimize", send);
  window.on("restore", send);
  window.on("show", send);
  window.on("hide", send);
}

export function registerWindowStateIpc() {
  ipcMain.handle(WINDOW_STATE_CHANNELS.get, (event): DesktopWindowState => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return window ? stateOf(window) : { background: false };
  });
  ipcMain.on(WINDOW_STATE_CHANNELS.showMain, (event) => {
    if (!isAppOrigin(event.senderFrame?.origin)) return;
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) bringToFront(window);
  });
  ipcMain.on(WINDOW_STATE_CHANNELS.movePip, (event, offset: unknown) => {
    if (!isAppOrigin(event.senderFrame?.origin) || !isWindowOffset(offset)) return;
    const pip = pipWindows.get(event.sender.id);
    if (!pip || pip.isDestroyed()) return;
    const [x, y] = pip.getPosition();
    pip.setPosition(x + Math.round(offset.x), y + Math.round(offset.y));
  });
}

export function pipWindowOptions(opener: BrowserWindow | null): BrowserWindowConstructorOptions {
  const display = opener
    ? screen.getDisplayMatching(opener.getBounds())
    : screen.getPrimaryDisplay();
  const { x, y, width, height } = display.workArea;
  return {
    ...PIP_WINDOW_SIZE,
    x: x + width - PIP_WINDOW_SIZE.width - PIP_WINDOW_MARGIN,
    y: y + height - PIP_WINDOW_SIZE.height - PIP_WINDOW_MARGIN,
    minWidth: PIP_WINDOW_MIN_SIZE.width,
    minHeight: PIP_WINDOW_MIN_SIZE.height,
    title: "MAULT",
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    backgroundColor: "#000000",
  };
}
