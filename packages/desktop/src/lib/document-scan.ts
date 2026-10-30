import {
  DESKTOP_DOCUMENT_SCAN_DRIVERS,
  type DesktopDocumentScanDriver,
  type DesktopDocumentScanErrorReason,
  type DesktopDocumentScanEvent,
  type DesktopDocumentScannerCaptureRequest,
  type DesktopDocumentScannerFeedResult,
  type DesktopDocumentScannerList,
  type DesktopDocumentScannerSelection,
  type DesktopDocumentScannerSessionRequest,
  type DesktopDocumentScanRequest,
  type DesktopDocumentScanSettings,
} from "@magic-vault/shared";
import { app, ipcMain, type IpcMainEvent, type IpcMainInvokeEvent, type WebContents } from "electron";
import { readdirSync, watch } from "fs";
import { mkdtemp, readFile, rm, stat, unlink } from "fs/promises";
import path from "path";
import { isAppOrigin } from "./app-url";
import {
  DOCUMENT_SCAN_CHANNELS,
  DOCUMENT_SCAN_MAX_FLATBED_HEIGHT_MM,
  DOCUMENT_SCAN_MAX_IMAGE_BYTES,
  DOCUMENT_SCAN_MAX_SCANNER_FIELD_LENGTH,
  DOCUMENT_SCAN_TEMP_PREFIX,
} from "./constants/desktop";
import {
  chooseDocumentScanFolder,
  documentScanImageMimeType,
  readDocumentScanFolder,
  waitUntilFileIsWritten,
} from "./document-scan-folder";
import { fakeDocumentScanners, openDocumentScannerSession } from "./document-scanner-session";
import type { ActiveDocumentScan, DocumentScannerSession } from "./interfaces/desktop";
import {
  findScannerHelperPath,
  listScannersWithHelper,
  startHelperScan,
} from "./scanner-helper";

let activeScan: ActiveDocumentScan | null = null;
let isStartingScan = false;
let scannerSession: DocumentScannerSession | null = null;
let isOpeningScannerSession = false;
let isFeedingCard = false;
const trackedWebContents = new WeakSet<WebContents>();

function assertAppOrigin(event: IpcMainInvokeEvent | IpcMainEvent) {
  if (!isAppOrigin(event.senderFrame?.origin)) {
    throw new Error("Document scanning is only available to the MAULT app");
  }
}

function isBoundedString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= DOCUMENT_SCAN_MAX_SCANNER_FIELD_LENGTH
  );
}

function parseScannerSelection(value: unknown): DesktopDocumentScannerSelection {
  const scanner = (value ?? {}) as Record<string, unknown>;
  if (
    isBoundedString(scanner.scannerId) &&
    isBoundedString(scanner.scannerName) &&
    DESKTOP_DOCUMENT_SCAN_DRIVERS.includes(scanner.driver as DesktopDocumentScanDriver)
  ) {
    return {
      scannerId: scanner.scannerId,
      scannerName: scanner.scannerName,
      driver: scanner.driver as DesktopDocumentScanDriver,
    };
  }
  throw new Error("Invalid document scanner");
}

function parseScanRequest(value: unknown): DesktopDocumentScanRequest {
  const request = (value ?? {}) as Record<string, unknown>;
  const settings = (request.settings ?? {}) as Record<string, unknown>;
  if (!isBoundedString(request.scanBatchId)) throw new Error("Invalid scan batch id");
  if (settings.source === "folder") {
    return { scanBatchId: request.scanBatchId, settings: { source: "folder" } };
  }
  if (settings.source !== "scanner") throw new Error("Invalid document scan settings");
  return {
    scanBatchId: request.scanBatchId,
    settings: { source: "scanner", ...parseScannerSelection(settings) },
  };
}

function parseSessionRequest(value: unknown): DesktopDocumentScannerSessionRequest {
  const request = (value ?? {}) as Record<string, unknown>;
  if (!isBoundedString(request.sessionId)) throw new Error("Invalid scanner session id");
  return { sessionId: request.sessionId, scanner: parseScannerSelection(request.scanner) };
}

function parseCaptureRequest(value: unknown): DesktopDocumentScannerCaptureRequest | null {
  if (value === undefined) return { kind: "feeder" };
  const request = (value ?? {}) as Record<string, unknown>;
  if (request.kind === "feeder" || request.kind === "flatbed-preview") return { kind: request.kind };
  if (
    request.kind === "flatbed" &&
    typeof request.scanHeightMm === "number" &&
    Number.isFinite(request.scanHeightMm) &&
    request.scanHeightMm > 0 &&
    request.scanHeightMm <= DOCUMENT_SCAN_MAX_FLATBED_HEIGHT_MM
  ) {
    return { kind: "flatbed", scanHeightMm: request.scanHeightMm };
  }
  return null;
}

function closeScannerSession() {
  scannerSession?.close();
  scannerSession = null;
}

function isScannerInUse() {
  return !!activeScan || isStartingScan || !!scannerSession || isOpeningScannerSession;
}

function createScanSession(webContents: WebContents, scanBatchId: string) {
  let pageCount = 0;
  let pageDelivery = Promise.resolve();

  const send = (event: DesktopDocumentScanEvent) => {
    if (!webContents.isDestroyed()) webContents.send(DOCUMENT_SCAN_CHANNELS.event, event);
  };

  const sendError = (reason: DesktopDocumentScanErrorReason, message?: string) =>
    send({ type: "error", scanBatchId, reason, message });

  const deliverPage = async (filePath: string, fileName: string, mimeType: string) => {
    const { size } = await stat(filePath);
    if (size > DOCUMENT_SCAN_MAX_IMAGE_BYTES) {
      sendError("unknown", `${fileName} is too large to import`);
      return;
    }
    const imageBytes = new Uint8Array(await readFile(filePath));
    send({ type: "page", scanBatchId, pageIndex: pageCount, fileName, mimeType, imageBytes });
    pageCount++;
  };

  const queuePage = (deliver: () => Promise<void>) => {
    pageDelivery = pageDelivery.then(deliver).catch((error: unknown) => {
      console.error("[document-scan] page delivery failed:", error);
      sendError("unknown", error instanceof Error ? error.message : String(error));
    });
  };

  const finish = async () => {
    await pageDelivery;
    send({ type: "finished", scanBatchId, pageCount });
    if (activeScan?.scanBatchId === scanBatchId) activeScan = null;
  };

  const failBeforeStart = (reason: DesktopDocumentScanErrorReason) => {
    sendError(reason);
    send({ type: "finished", scanBatchId, pageCount: 0 });
    return null;
  };

  return { deliverPage, queuePage, sendError, finish, failBeforeStart };
}

async function startScannerScan(
  webContents: WebContents,
  scanBatchId: string,
  settings: Extract<DesktopDocumentScanSettings, { source: "scanner" }>,
): Promise<ActiveDocumentScan | null> {
  const session = createScanSession(webContents, scanBatchId);
  const helperPath = findScannerHelperPath();
  if (!helperPath) return session.failBeforeStart("scanner_helper_missing");

  const outputDirectory = await mkdtemp(path.join(app.getPath("temp"), DOCUMENT_SCAN_TEMP_PREFIX));
  let didHelperFinish = false;
  const helperScan = startHelperScan(
    helperPath,
    [
      "--driver",
      settings.driver,
      "--scanner-id",
      settings.scannerId,
      "--scanner-name",
      settings.scannerName,
      "--output-dir",
      outputDirectory,
    ],
    (message) => {
      if (message.type === "page" && typeof message.filePath === "string") {
        const filePath = path.resolve(message.filePath);
        if (path.dirname(filePath) !== outputDirectory) return;
        session.queuePage(async () => {
          await session.deliverPage(filePath, path.basename(filePath), "image/jpeg");
          await unlink(filePath);
        });
      }
      if (message.type === "error") session.sendError(message.reason, message.message);
      if (message.type === "finished") didHelperFinish = true;
    },
  );

  void helperScan.exited.then(async () => {
    if (!didHelperFinish) session.sendError("unknown", "The scanner helper stopped unexpectedly");
    await session.finish();
    await rm(outputDirectory, { recursive: true, force: true });
  });

  return { scanBatchId, webContents, stop: helperScan.stop };
}

async function startFolderWatch(
  webContents: WebContents,
  scanBatchId: string,
): Promise<ActiveDocumentScan | null> {
  const session = createScanSession(webContents, scanBatchId);
  const folderPath = readDocumentScanFolder();
  if (!folderPath) return session.failBeforeStart("folder_missing");

  const seenFileNames = new Set(readdirSync(folderPath));
  const watcher = watch(folderPath, (_eventType, changedFileName) => {
    const fileName = changedFileName?.toString();
    if (!fileName || seenFileNames.has(fileName)) return;
    const mimeType = documentScanImageMimeType(fileName);
    if (!mimeType) return;
    seenFileNames.add(fileName);
    const filePath = path.join(folderPath, fileName);
    session.queuePage(async () => {
      if (!(await waitUntilFileIsWritten(filePath))) {
        console.error(`[document-scan] ${fileName} never finished writing, skipped`);
        return;
      }
      await session.deliverPage(filePath, fileName, mimeType);
    });
  });

  let isWatching = true;
  const stop = () => {
    if (!isWatching) return;
    isWatching = false;
    watcher.close();
    void session.finish();
  };
  watcher.on("error", (error) => {
    console.error("[document-scan] folder watch failed:", error);
    session.sendError("folder_missing", error.message);
    stop();
  });

  return { scanBatchId, webContents, stop };
}

function stopActiveScan() {
  activeScan?.stop();
}

function stopScanWhenPageLeaves(webContents: WebContents) {
  if (trackedWebContents.has(webContents)) return;
  trackedWebContents.add(webContents);
  const stopScanOfThisPage = () => {
    if (activeScan?.webContents === webContents) stopActiveScan();
    if (scannerSession?.webContents === webContents) closeScannerSession();
  };
  webContents.on("did-start-navigation", (details) => {
    if (details.isMainFrame && !details.isSameDocument) stopScanOfThisPage();
  });
  webContents.once("destroyed", stopScanOfThisPage);
}

export function registerDocumentScanIpc() {
  ipcMain.handle(
    DOCUMENT_SCAN_CHANNELS.listScanners,
    async (event): Promise<DesktopDocumentScannerList> => {
      assertAppOrigin(event);
      const fakeScanners = fakeDocumentScanners();
      const helperPath = findScannerHelperPath();
      if (!helperPath) {
        return { isScannerHelperInstalled: fakeScanners.length > 0, scanners: fakeScanners };
      }
      const scanners = await listScannersWithHelper(helperPath);
      return { isScannerHelperInstalled: true, scanners: [...fakeScanners, ...scanners] };
    },
  );

  ipcMain.handle(DOCUMENT_SCAN_CHANNELS.getFolder, (event) => {
    assertAppOrigin(event);
    return readDocumentScanFolder();
  });

  ipcMain.handle(DOCUMENT_SCAN_CHANNELS.chooseFolder, (event) => {
    assertAppOrigin(event);
    return chooseDocumentScanFolder(event.sender);
  });

  ipcMain.handle(DOCUMENT_SCAN_CHANNELS.start, async (event, value: unknown) => {
    assertAppOrigin(event);
    if (isScannerInUse()) throw new Error("The document scanner is already in use");
    const { scanBatchId, settings } = parseScanRequest(value);
    const webContents = event.sender;
    isStartingScan = true;
    const scan = await (settings.source === "folder"
      ? startFolderWatch(webContents, scanBatchId)
      : startScannerScan(webContents, scanBatchId, settings)
    ).finally(() => {
      isStartingScan = false;
    });
    if (!scan) return;
    activeScan = scan;
    stopScanWhenPageLeaves(webContents);
  });

  ipcMain.handle(DOCUMENT_SCAN_CHANNELS.openSession, async (event, value: unknown) => {
    assertAppOrigin(event);
    const { sessionId, scanner } = parseSessionRequest(value);
    if (scannerSession?.sessionId === sessionId) return;
    if (scannerSession?.webContents === event.sender) closeScannerSession();
    if (isScannerInUse()) throw new Error("The document scanner is already in use");
    isOpeningScannerSession = true;
    try {
      scannerSession = await openDocumentScannerSession(sessionId, event.sender, scanner);
    } finally {
      isOpeningScannerSession = false;
    }
    stopScanWhenPageLeaves(event.sender);
  });

  ipcMain.handle(
    DOCUMENT_SCAN_CHANNELS.feedCard,
    async (
      event,
      sessionId: unknown,
      requestValue: unknown,
    ): Promise<DesktopDocumentScannerFeedResult> => {
      assertAppOrigin(event);
      const captureRequest = parseCaptureRequest(requestValue);
      if (!captureRequest) return { type: "error", reason: "unknown", message: "Invalid capture request" };
      const session = scannerSession;
      if (!session || session.sessionId !== sessionId || session.webContents !== event.sender) {
        return { type: "error", reason: "session_closed" };
      }
      if (isFeedingCard) return { type: "error", reason: "scanner_busy" };
      isFeedingCard = true;
      try {
        return await session.feedCard(captureRequest);
      } finally {
        isFeedingCard = false;
      }
    },
  );

  ipcMain.on(DOCUMENT_SCAN_CHANNELS.closeSession, (event, sessionId: unknown) => {
    if (!isAppOrigin(event.senderFrame?.origin)) return;
    if (scannerSession?.sessionId === sessionId && scannerSession.webContents === event.sender) {
      closeScannerSession();
    }
  });

  ipcMain.on(DOCUMENT_SCAN_CHANNELS.stop, (event) => {
    if (!isAppOrigin(event.senderFrame?.origin)) return;
    if (activeScan?.webContents === event.sender) stopActiveScan();
  });

  app.on("before-quit", () => {
    stopActiveScan();
    closeScannerSession();
  });
}
