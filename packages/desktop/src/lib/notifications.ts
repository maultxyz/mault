import type { DesktopNotification } from "@magic-vault/shared";
import { BrowserWindow, ipcMain, Notification } from "electron";
import { isAppOrigin } from "./app-url";
import {
  MAX_NOTIFICATION_BODY_LENGTH,
  MAX_NOTIFICATION_TITLE_LENGTH,
  NOTIFICATION_CHANNEL,
  NOTIFICATION_DEDUPE_MS,
} from "./constants/desktop";
import { bringToFront } from "./window-state";

const shown = new Set<Notification>();
const recent = new Map<string, number>();

function parseNotification(value: unknown): DesktopNotification | null {
  if (!value || typeof value !== "object") return null;
  const { title, body } = value as Record<string, unknown>;
  if (typeof title !== "string" || !title.trim()) return null;
  if (body !== undefined && typeof body !== "string") return null;
  return {
    title: title.slice(0, MAX_NOTIFICATION_TITLE_LENGTH),
    body: body?.slice(0, MAX_NOTIFICATION_BODY_LENGTH),
  };
}

function isDuplicate(notification: DesktopNotification): boolean {
  const now = Date.now();
  for (const [key, at] of recent) {
    if (now - at > NOTIFICATION_DEDUPE_MS) recent.delete(key);
  }
  const key = `${notification.title}\n${notification.body ?? ""}`;
  if (recent.has(key)) return true;
  recent.set(key, now);
  return false;
}

export function registerDesktopNotifications() {
  ipcMain.on(NOTIFICATION_CHANNEL, (event, value: unknown) => {
    if (!isAppOrigin(event.senderFrame?.origin)) return;
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || (window.isFocused() && !window.isMinimized())) return;
    const parsed = parseNotification(value);
    if (!parsed || !Notification.isSupported() || isDuplicate(parsed)) return;
    const notification = new Notification({ title: parsed.title, body: parsed.body ?? "" });
    shown.add(notification);
    notification.on("click", () => bringToFront(window));
    notification.on("close", () => shown.delete(notification));
    notification.show();
  });
}
