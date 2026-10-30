import { app, BrowserWindow, dialog, type WebContents } from "electron";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import {
  DOCUMENT_SCAN_FOLDER_FILE,
  DOCUMENT_SCAN_FOLDER_SETTLE_POLL_MS,
  DOCUMENT_SCAN_FOLDER_SETTLE_TIMEOUT_MS,
  DOCUMENT_SCAN_IMAGE_MIME_TYPES,
} from "./constants/desktop";
import type { StoredDocumentScanFolder } from "./interfaces/desktop";

function storePath() {
  return path.join(app.getPath("userData"), DOCUMENT_SCAN_FOLDER_FILE);
}

export function readDocumentScanFolder(): string | null {
  try {
    const stored = JSON.parse(readFileSync(storePath(), "utf-8")) as StoredDocumentScanFolder;
    return typeof stored.folderPath === "string" && existsSync(stored.folderPath)
      ? stored.folderPath
      : null;
  } catch {
    return null;
  }
}

export async function chooseDocumentScanFolder(webContents: WebContents): Promise<string | null> {
  const window = BrowserWindow.fromWebContents(webContents);
  const options: Electron.OpenDialogOptions = {
    properties: ["openDirectory"],
    defaultPath: readDocumentScanFolder() ?? undefined,
  };
  const result = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options);
  const folderPath = result.filePaths[0];
  if (result.canceled || !folderPath) return readDocumentScanFolder();
  const stored: StoredDocumentScanFolder = { folderPath };
  writeFileSync(storePath(), JSON.stringify(stored));
  return folderPath;
}

export function documentScanImageMimeType(fileName: string): string | null {
  return DOCUMENT_SCAN_IMAGE_MIME_TYPES[path.extname(fileName).toLowerCase()] ?? null;
}

export async function waitUntilFileIsWritten(filePath: string): Promise<boolean> {
  const deadline = Date.now() + DOCUMENT_SCAN_FOLDER_SETTLE_TIMEOUT_MS;
  let previousSize = -1;
  while (Date.now() < deadline) {
    const size = await stat(filePath).then(
      (fileStats) => fileStats.size,
      () => null,
    );
    if (size === null) return false;
    if (size > 0 && size === previousSize) return true;
    previousSize = size;
    await delay(DOCUMENT_SCAN_FOLDER_SETTLE_POLL_MS);
  }
  return false;
}
