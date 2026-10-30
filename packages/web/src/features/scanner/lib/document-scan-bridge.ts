import {
  DOCUMENT_SCANNER_CAMERA_ID_PREFIX,
  DOCUMENT_SCANNER_MODES,
} from "@/lib/constants/scanner";
import type {
  DocumentScanBridge,
  DocumentScannerMode,
  DocumentScannerOption,
  DocumentScannerSessionBridge,
} from "@/lib/interfaces/scanner";
import type { DesktopDocumentScanner } from "@magic-vault/shared";

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
    listDocumentScanners: desktop.listDocumentScanners,
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
    listDocumentScanners: desktop.listDocumentScanners,
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
