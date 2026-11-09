import {
  DOCUMENT_SCANNER_CAMERA_ID_PREFIX,
  DOCUMENT_SCANNER_MODES,
} from "@/lib/constants/scanner";
import type {
  DocumentScanArchiveBridge,
  DocumentScanBridge,
  DocumentScannerMode,
  DocumentScannerOption,
  DocumentScannerSessionBridge,
} from "@/lib/interfaces/scanner";
import { DESKTOP_DOCUMENT_SCAN_DRIVERS } from "@magic-vault/shared";
import type {
  DesktopDocumentScanArchiveImage,
  DesktopDocumentScanArchiveSide,
  DesktopDocumentScanner,
  DesktopDocumentScannerList,
} from "@magic-vault/shared";

function listWiaDocumentScanners(
  listDocumentScanners: () => Promise<DesktopDocumentScannerList>,
) {
  return async (): Promise<DesktopDocumentScannerList> => {
    const scannerList = await listDocumentScanners();
    return {
      ...scannerList,
      scanners: scannerList.scanners.filter((scanner) =>
        DESKTOP_DOCUMENT_SCAN_DRIVERS.includes(scanner.driver),
      ),
    };
  };
}

export function getDocumentScanBridge(): DocumentScanBridge | null {
  const desktop = window.maultDesktop;
  if (
    !desktop?.listDocumentScanners ||
    !desktop.getDocumentScanFolder ||
    !desktop.chooseDocumentScanFolder ||
    !desktop.startDocumentScan ||
    !desktop.stopDocumentScan ||
    !desktop.onDocumentScanEvent
  ) {
    return null;
  }
  return {
    listDocumentScanners: listWiaDocumentScanners(desktop.listDocumentScanners),
    getDocumentScanFolder: desktop.getDocumentScanFolder,
    chooseDocumentScanFolder: desktop.chooseDocumentScanFolder,
    startDocumentScan: desktop.startDocumentScan,
    stopDocumentScan: desktop.stopDocumentScan,
    onDocumentScanEvent: desktop.onDocumentScanEvent,
  };
}

export function documentScannerKey(scanner: DesktopDocumentScanner): string {
  return `${scanner.driver}:${scanner.scannerId}`;
}

export function requireBridge(
  bridge: DocumentScanBridge | null,
): DocumentScanBridge {
  if (!bridge) throw new Error("Document scanning needs the MAULT desktop app");
  return bridge;
}

export function getDocumentScannerSessionBridge(): DocumentScannerSessionBridge | null {
  const desktop = window.maultDesktop;
  if (
    !desktop?.listDocumentScanners ||
    !desktop.openDocumentScannerSession ||
    !desktop.feedDocumentScannerCard ||
    !desktop.closeDocumentScannerSession
  ) {
    return null;
  }
  return {
    listDocumentScanners: listWiaDocumentScanners(desktop.listDocumentScanners),
    openDocumentScannerSession: desktop.openDocumentScannerSession,
    feedDocumentScannerCard: desktop.feedDocumentScannerCard,
    closeDocumentScannerSession: desktop.closeDocumentScannerSession,
  };
}

export function requireDocumentScannerSessionBridge(
  bridge: DocumentScannerSessionBridge | null,
): DocumentScannerSessionBridge {
  if (!bridge) throw new Error("Document scanners need the MAULT desktop app");
  return bridge;
}

export function documentScannerCameraId(
  scanner: DesktopDocumentScanner,
  mode: DocumentScannerMode,
): string {
  return `${DOCUMENT_SCANNER_CAMERA_ID_PREFIX}${mode}:${documentScannerKey(scanner)}`;
}

export function documentScannerModeOf(cameraId: string | null | undefined): DocumentScannerMode | null {
  if (!isDocumentScannerCameraId(cameraId)) return null;
  const mode = cameraId?.slice(DOCUMENT_SCANNER_CAMERA_ID_PREFIX.length).split(":")[0];
  return DOCUMENT_SCANNER_MODES.find((candidate) => candidate === mode) ?? null;
}

export function documentScannerOptionsFor(
  scanners: DesktopDocumentScanner[],
): DocumentScannerOption[] {
  return scanners.flatMap((scanner) => {
    const modes: DocumentScannerMode[] = [];
    if (scanner.hasFeeder !== false) modes.push("feeder");
    if (scanner.hasFlatbed === true) modes.push("flatbed");
    return modes.map((mode) => ({
      cameraId: documentScannerCameraId(scanner, mode),
      scanner,
      mode,
      hasOtherMode: modes.length > 1,
    }));
  });
}

export function isDocumentScannerCameraId(cameraId: string | null | undefined): boolean {
  return !!cameraId?.startsWith(DOCUMENT_SCANNER_CAMERA_ID_PREFIX);
}

export function getDocumentScanArchiveBridge(): DocumentScanArchiveBridge | null {
  const desktop = window.maultDesktop;
  if (
    !desktop?.getDocumentScanArchiveFolder ||
    !desktop.chooseDocumentScanArchiveFolder ||
    !desktop.clearDocumentScanArchiveFolder ||
    !desktop.archiveDocumentScan
  ) {
    return null;
  }
  return {
    getDocumentScanArchiveFolder: desktop.getDocumentScanArchiveFolder,
    chooseDocumentScanArchiveFolder: desktop.chooseDocumentScanArchiveFolder,
    clearDocumentScanArchiveFolder: desktop.clearDocumentScanArchiveFolder,
    archiveDocumentScan: desktop.archiveDocumentScan,
  };
}

export function folderDisplayName(folderPath: string): string {
  return folderPath.split(/[\\/]/).filter(Boolean).pop() ?? folderPath;
}

export async function documentScanArchiveImage(
  side: DesktopDocumentScanArchiveSide,
  imageUrl: string,
): Promise<DesktopDocumentScanArchiveImage> {
  const blob = await (await fetch(imageUrl)).blob();
  return { side, mimeType: blob.type, imageBytes: new Uint8Array(await blob.arrayBuffer()) };
}
