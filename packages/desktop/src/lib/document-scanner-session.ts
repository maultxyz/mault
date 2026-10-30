import type {
  DesktopDocumentScanErrorReason,
  DesktopDocumentScanner,
  DesktopDocumentScannerCaptureRequest,
  DesktopDocumentScannerFeedResult,
  DesktopDocumentScannerSelection,
} from "@magic-vault/shared";
import { app, type WebContents } from "electron";
import { readdirSync } from "fs";
import { mkdtemp, readFile, rm, unlink } from "fs/promises";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import {
  DOCUMENT_SCAN_TEMP_PREFIX,
  FAKE_SCANNER_DIRECTORY_ENV,
  FAKE_SCANNER_ERROR_EVERY_ENV,
  FAKE_SCANNER_ERROR_REASON_ENV,
  FAKE_SCANNER_FEED_DELAY_MS,
  FAKE_SCANNER_ID,
  FAKE_SCANNER_NAME,
} from "./constants/desktop";
import { documentScanImageMimeType } from "./document-scan-folder";
import type { DocumentScannerSession } from "./interfaces/desktop";
import { findScannerHelperPath, openHelperSession } from "./scanner-helper";

function fakeScannerDirectory(): string | null {
  if (app.isPackaged) return null;
  return process.env[FAKE_SCANNER_DIRECTORY_ENV] || null;
}

export function fakeDocumentScanners(): DesktopDocumentScanner[] {
  return fakeScannerDirectory()
    ? [
        {
          scannerId: FAKE_SCANNER_ID,
          name: FAKE_SCANNER_NAME,
          driver: "twain",
          hasFeeder: true,
          hasFlatbed: true,
          isSimulated: true,
        },
      ]
    : [];
}

function openFakeSession(
  sessionId: string,
  webContents: WebContents,
  directory: string,
): DocumentScannerSession {
  const errorEvery = Number(process.env[FAKE_SCANNER_ERROR_EVERY_ENV]) || 0;
  const errorReason = (process.env[FAKE_SCANNER_ERROR_REASON_ENV] ||
    "paper_jam") as DesktopDocumentScanErrorReason;
  let feedCount = 0;

  return {
    sessionId,
    webContents,
    feedCard: async (request) => {
      await delay(FAKE_SCANNER_FEED_DELAY_MS);
      feedCount++;
      if (errorEvery > 0 && feedCount % errorEvery === 0) {
        return { type: "error", reason: errorReason, message: "Fake scanner error" };
      }
      const fileNames = readdirSync(directory)
        .filter((fileName) => documentScanImageMimeType(fileName))
        .sort((first, second) => first.localeCompare(second, undefined, { numeric: true }));
      if (fileNames.length === 0) return { type: "error", reason: "feeder_empty" };
      const fileName = fileNames[(feedCount - 1) % fileNames.length];
      const imageBytes = new Uint8Array(await readFile(path.join(directory, fileName)));
      return {
        type: "page",
        fileName,
        mimeType: documentScanImageMimeType(fileName) ?? "image/jpeg",
        imageBytes,
        paperSource: request.kind === "feeder" ? "feeder" : "flatbed",
      };
    },
    close: () => {},
  };
}

function helperCommandFor(request: DesktopDocumentScannerCaptureRequest): string {
  if (request.kind === "flatbed") return `flatbed ${request.scanHeightMm.toFixed(1)}`;
  if (request.kind === "flatbed-preview") return "preview";
  return "feed";
}

async function openHelperBackedSession(
  sessionId: string,
  webContents: WebContents,
  scanner: DesktopDocumentScannerSelection,
): Promise<DocumentScannerSession> {
  const helperPath = findScannerHelperPath();
  if (!helperPath) throw new Error("The scanner helper is not installed");
  const outputDirectory = await mkdtemp(path.join(app.getPath("temp"), DOCUMENT_SCAN_TEMP_PREFIX));
  const helperSession = await openHelperSession(helperPath, [
    "--driver",
    scanner.driver,
    "--scanner-id",
    scanner.scannerId,
    "--scanner-name",
    scanner.scannerName,
    "--output-dir",
    outputDirectory,
  ]).catch(async (error: unknown) => {
    await rm(outputDirectory, { recursive: true, force: true });
    throw error;
  });

  const feedCard = async (
    request: DesktopDocumentScannerCaptureRequest,
  ): Promise<DesktopDocumentScannerFeedResult> => {
    const message = await helperSession.requestPage(helperCommandFor(request));
    if (!message) {
      return { type: "error", reason: "session_closed", message: "The scanner helper stopped responding" };
    }
    if (message.type === "error") {
      return { type: "error", reason: message.reason, message: message.message };
    }
    if (message.type !== "page" || typeof message.filePath !== "string") {
      return { type: "error", reason: "unknown", message: `Unexpected helper reply: ${message.type}` };
    }
    const filePath = path.resolve(message.filePath);
    if (path.dirname(filePath) !== outputDirectory) {
      return { type: "error", reason: "unknown", message: "Scanner helper wrote outside its folder" };
    }
    const imageBytes = new Uint8Array(await readFile(filePath));
    await unlink(filePath);
    return {
      type: "page",
      fileName: path.basename(filePath),
      mimeType: "image/jpeg",
      imageBytes,
      paperSource: message.paperSource === "flatbed" ? "flatbed" : "feeder",
      scanWidthMm: message.scanWidthMm,
      scanHeightMm: message.scanHeightMm,
    };
  };

  return {
    sessionId,
    webContents,
    feedCard,
    close: () => {
      helperSession.close();
      void rm(outputDirectory, { recursive: true, force: true });
    },
  };
}

export function openDocumentScannerSession(
  sessionId: string,
  webContents: WebContents,
  scanner: DesktopDocumentScannerSelection,
): Promise<DocumentScannerSession> {
  const directory = fakeScannerDirectory();
  if (directory && scanner.scannerId === FAKE_SCANNER_ID) {
    return Promise.resolve(openFakeSession(sessionId, webContents, directory));
  }
  return openHelperBackedSession(sessionId, webContents, scanner);
}
