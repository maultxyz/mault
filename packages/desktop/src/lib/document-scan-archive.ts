import type {
  DesktopDocumentScanArchiveImage,
  DesktopDocumentScanArchiveRequest,
} from "@magic-vault/shared";
import { app, BrowserWindow, dialog, type WebContents } from "electron";
import { existsSync, readFileSync } from "fs";
import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import {
  DOCUMENT_SCAN_ARCHIVE_EXTENSIONS,
  DOCUMENT_SCAN_ARCHIVE_FOLDER_FILE,
  DOCUMENT_SCAN_ARCHIVE_INVALID_NAME_CHARACTERS,
  DOCUMENT_SCAN_ARCHIVE_MAX_IMAGES,
  DOCUMENT_SCAN_ARCHIVE_MAX_NAME_LENGTH,
  DOCUMENT_SCAN_ARCHIVE_RESERVED_NAMES,
  DOCUMENT_SCAN_ARCHIVE_UNNAMED_FOLDER,
  DOCUMENT_SCAN_MAX_IMAGE_BYTES,
  DOCUMENT_SCAN_MAX_SCANNER_FIELD_LENGTH,
} from "./constants/desktop";
import type { StoredDocumentScanArchiveFolder } from "./interfaces/desktop";

function storePath() {
  return path.join(app.getPath("userData"), DOCUMENT_SCAN_ARCHIVE_FOLDER_FILE);
}

export function readDocumentScanArchiveFolder(): string | null {
  try {
    const stored = JSON.parse(
      readFileSync(storePath(), "utf-8"),
    ) as StoredDocumentScanArchiveFolder;
    return typeof stored.folderPath === "string" && existsSync(stored.folderPath)
      ? stored.folderPath
      : null;
  } catch {
    return null;
  }
}

export async function chooseDocumentScanArchiveFolder(
  webContents: WebContents,
): Promise<string | null> {
  const window = BrowserWindow.fromWebContents(webContents);
  const options: Electron.OpenDialogOptions = {
    properties: ["openDirectory", "createDirectory"],
    defaultPath: readDocumentScanArchiveFolder() ?? undefined,
  };
  const result = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options);
  const folderPath = result.filePaths[0];
  if (result.canceled || !folderPath) return readDocumentScanArchiveFolder();
  const stored: StoredDocumentScanArchiveFolder = { folderPath };
  await writeFile(storePath(), JSON.stringify(stored));
  return folderPath;
}

export async function clearDocumentScanArchiveFolder(): Promise<void> {
  await rm(storePath(), { force: true });
}

export function toArchiveFolderName(name: string, fallback: string): string {
  const cleaned = name
    .replace(DOCUMENT_SCAN_ARCHIVE_INVALID_NAME_CHARACTERS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, DOCUMENT_SCAN_ARCHIVE_MAX_NAME_LENGTH)
    .replace(/[. ]+$/, "");
  if (!cleaned || DOCUMENT_SCAN_ARCHIVE_RESERVED_NAMES.test(cleaned)) return fallback;
  return cleaned;
}

export function binFolderName(binNumber: number): string {
  return `bin ${binNumber}`;
}

function isBoundedString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= DOCUMENT_SCAN_MAX_SCANNER_FIELD_LENGTH
  );
}

function parseArchiveImage(value: unknown): DesktopDocumentScanArchiveImage {
  const image = (value ?? {}) as Record<string, unknown>;
  if (
    (image.side === "front" || image.side === "back") &&
    typeof image.mimeType === "string" &&
    DOCUMENT_SCAN_ARCHIVE_EXTENSIONS[image.mimeType] &&
    image.imageBytes instanceof Uint8Array &&
    image.imageBytes.byteLength > 0 &&
    image.imageBytes.byteLength <= DOCUMENT_SCAN_MAX_IMAGE_BYTES
  ) {
    return { side: image.side, mimeType: image.mimeType, imageBytes: image.imageBytes };
  }
  throw new Error("Invalid scan image");
}

export function parseArchiveRequest(value: unknown): DesktopDocumentScanArchiveRequest {
  const request = (value ?? {}) as Record<string, unknown>;
  if (!isBoundedString(request.scanId)) throw new Error("Invalid scan id");
  if (!isBoundedString(request.collectionName)) throw new Error("Invalid collection name");
  const binNumber =
    typeof request.binNumber === "number" &&
    Number.isInteger(request.binNumber) &&
    request.binNumber > 0
      ? request.binNumber
      : null;
  const cardName = isBoundedString(request.cardName) ? request.cardName : null;
  if (
    !Array.isArray(request.images) ||
    request.images.length === 0 ||
    request.images.length > DOCUMENT_SCAN_ARCHIVE_MAX_IMAGES
  ) {
    throw new Error("Invalid scan images");
  }
  return {
    scanId: request.scanId,
    collectionName: request.collectionName,
    binNumber,
    cardName,
    images: request.images.map(parseArchiveImage),
  };
}

export async function archiveDocumentScan(
  request: DesktopDocumentScanArchiveRequest,
): Promise<void> {
  const archiveFolder = readDocumentScanArchiveFolder();
  if (!archiveFolder) throw new Error("No folder is set for saving scans");
  const collectionFolder = path.join(
    archiveFolder,
    toArchiveFolderName(request.collectionName, DOCUMENT_SCAN_ARCHIVE_UNNAMED_FOLDER),
  );
  const targetFolder =
    request.binNumber == null
      ? collectionFolder
      : path.join(collectionFolder, binFolderName(request.binNumber));
  if (path.relative(archiveFolder, targetFolder).startsWith("..")) {
    throw new Error("Invalid scan folder");
  }
  await mkdir(targetFolder, { recursive: true });
  const scanId = toArchiveFolderName(request.scanId, "scan");
  const baseName = request.cardName
    ? `${toArchiveFolderName(request.cardName, "card")} ${scanId}`
    : scanId;
  await Promise.all(
    request.images.map((image) =>
      writeFile(
        path.join(
          targetFolder,
          `${baseName}${image.side === "back" ? " back" : ""}${DOCUMENT_SCAN_ARCHIVE_EXTENSIONS[image.mimeType]}`,
        ),
        image.imageBytes,
      ),
    ),
  );
}
