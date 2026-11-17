import { DESKTOP_PIP_FRAME_NAME } from "@magic-vault/shared";
import { BrowserWindow, shell, type WebContents } from "electron";
import path from "path";
import { getStartUrl, getStrings, isAppOrigin } from "./app-url";
import { ABORTED_LOAD_ERROR_CODE, EXTERNAL_PROTOCOLS } from "./constants/desktop";
import { pipWindowOptions, trackPipWindow } from "./window-state";

function protocolOf(url: string): string | null {
  try {
    return new URL(url).protocol;
  } catch {
    return null;
  }
}

function openExternally(url: string) {
  const protocol = protocolOf(url);
  if (protocol && EXTERNAL_PROTOCOLS.has(protocol)) void shell.openExternal(url);
}

function showOffline(webContents: WebContents, failedUrl: string) {
  const strings = getStrings();
  void webContents.loadFile(path.join(__dirname, "offline.html"), {
    query: {
      url: isAppOrigin(failedUrl) ? failedUrl : getStartUrl(),
      title: strings.offlineTitle,
      body: strings.offlineBody,
      retry: strings.retry,
    },
  });
}

export function registerNavigation(webContents: WebContents) {
  webContents.setWindowOpenHandler(({ url, frameName }) => {
    if (frameName === DESKTOP_PIP_FRAME_NAME && url === "about:blank") {
      return {
        action: "allow",
        overrideBrowserWindowOptions: pipWindowOptions(BrowserWindow.fromWebContents(webContents)),
      };
    }
    if (isAppOrigin(url)) return { action: "allow" };
    openExternally(url);
    return { action: "deny" };
  });
  webContents.on("did-create-window", (child, { frameName }) => {
    if (frameName === DESKTOP_PIP_FRAME_NAME) trackPipWindow(webContents, child);
  });
  webContents.on("will-navigate", (event, url) => {
    const protocol = protocolOf(url);
    if (protocol === "http:" || protocol === "https:") return;
    event.preventDefault();
    openExternally(url);
  });
  webContents.on("did-fail-load", (_event, errorCode, _description, url, isMainFrame) => {
    if (!isMainFrame || errorCode === ABORTED_LOAD_ERROR_CODE) return;
    showOffline(webContents, url);
  });
}
