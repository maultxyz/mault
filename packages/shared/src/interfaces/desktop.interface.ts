export type DesktopScannerCommand =
  | "pause"
  | "resume"
  | "scan-card"
  | "toggle-auto-feed"
  | "clear-device";

export type DesktopScannerIcon =
  | "pause"
  | "play"
  | "auto-feed-on"
  | "auto-feed-off"
  | "clear-device";

export interface DesktopScannerButton {
  command: DesktopScannerCommand;
  icon: DesktopScannerIcon;
  tooltip: string;
  disabled?: boolean;
}

export interface DesktopNotification {
  title: string;
  body?: string;
}

export interface DesktopWindowState {
  background: boolean;
}

export interface DesktopWindowOffset {
  x: number;
  y: number;
}

export type DesktopDocumentScanDriver = "twain" | "wia";

export interface DesktopDocumentScanner {
  scannerId: string;
  name: string;
  driver: DesktopDocumentScanDriver;
  hasFeeder?: boolean;
  hasFlatbed?: boolean;
  isSimulated?: boolean;
}

export interface DesktopDocumentScannerList {
  isScannerHelperInstalled: boolean;
  scanners: DesktopDocumentScanner[];
}

export interface DesktopDocumentScannerSelection {
  scannerId: string;
  scannerName: string;
  driver: DesktopDocumentScanDriver;
}

export type DesktopDocumentScanSettings =
  | ({ source: "scanner" } & DesktopDocumentScannerSelection)
  | { source: "folder" };

export interface DesktopDocumentScanRequest {
  scanBatchId: string;
  settings: DesktopDocumentScanSettings;
}

export type DesktopDocumentScanErrorReason =
  | "scanner_helper_missing"
  | "scanner_busy"
  | "scanner_offline"
  | "paper_jam"
  | "feeder_empty"
  | "cover_open"
  | "no_feeder"
  | "scanner_error"
  | "folder_missing"
  | "scanner_in_use"
  | "session_closed"
  | "unknown";

export type DesktopDocumentScanEvent =
  | {
      type: "page";
      scanBatchId: string;
      pageIndex: number;
      fileName: string;
      mimeType: string;
      imageBytes: Uint8Array;
    }
  | {
      type: "error";
      scanBatchId: string;
      reason: DesktopDocumentScanErrorReason;
      message?: string;
    }
  | {
      type: "finished";
      scanBatchId: string;
      pageCount: number;
    };

export interface DesktopDocumentScannerSessionRequest {
  sessionId: string;
  scanner: DesktopDocumentScannerSelection;
}

export type DesktopDocumentScannerPaperSource = "feeder" | "flatbed";

export type DesktopDocumentScannerCaptureRequest =
  | { kind: "feeder" }
  | { kind: "flatbed"; scanHeightMm: number }
  | { kind: "flatbed-preview" };

export type DesktopDocumentScannerFeedResult =
  | {
      type: "page";
      fileName: string;
      mimeType: string;
      imageBytes: Uint8Array;
      paperSource?: DesktopDocumentScannerPaperSource;
      scanWidthMm?: number;
      scanHeightMm?: number;
    }
  | {
      type: "error";
      reason: DesktopDocumentScanErrorReason;
      message?: string;
    };

export interface DesktopBridge {
  setScannerButtons: (buttons: DesktopScannerButton[] | null) => void;
  notify: (notification: DesktopNotification) => void;
  getWindowState: () => Promise<DesktopWindowState>;
  onWindowState: (listener: (state: DesktopWindowState) => void) => () => void;
  showMainWindow: () => void;
  movePipWindowBy: (offset: DesktopWindowOffset) => void;
  onScannerCommand: (listener: (command: DesktopScannerCommand) => void) => () => void;
  listDocumentScanners?: () => Promise<DesktopDocumentScannerList>;
  getDocumentScanFolder?: () => Promise<string | null>;
  chooseDocumentScanFolder?: () => Promise<string | null>;
  startDocumentScan?: (request: DesktopDocumentScanRequest) => Promise<void>;
  stopDocumentScan?: () => void;
  onDocumentScanEvent?: (
    listener: (event: DesktopDocumentScanEvent) => void,
  ) => () => void;
  openDocumentScannerSession?: (
    request: DesktopDocumentScannerSessionRequest,
  ) => Promise<void>;
  feedDocumentScannerCard?: (
    sessionId: string,
    request?: DesktopDocumentScannerCaptureRequest,
  ) => Promise<DesktopDocumentScannerFeedResult>;
  closeDocumentScannerSession?: (sessionId: string) => void;
}
