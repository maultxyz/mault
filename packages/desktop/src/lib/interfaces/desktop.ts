import type {
  DesktopDocumentScanErrorReason,
  DesktopDocumentScanner,
  DesktopDocumentScannerCaptureRequest,
  DesktopDocumentScannerFeedResult,
} from "@magic-vault/shared";
import type { BrowserWindow, WebContents } from "electron";

export type PickerKind = "serial" | "bluetooth";

export type DesktopChannel = "production" | "development";

export interface DesktopChannelSettings {
  appUrl: string;
  appUserModelId: string;
  iconBaseName: string;
}

export type DesktopLocale = "en" | "de" | "fr";

export interface PickerDevice {
  id: string;
  label: string;
  detail?: string;
  isNamePending?: boolean;
}

export interface PickerState {
  kind: PickerKind;
  devices: PickerDevice[];
  strings: PickerStrings;
}

export interface PickerStrings {
  title: string;
  searching: string;
  connect: string;
  cancel: string;
}

export interface DesktopStrings {
  serialTitle: string;
  bluetoothTitle: string;
  searching: string;
  lookingUpName: string;
  connect: string;
  cancel: string;
  offlineTitle: string;
  offlineBody: string;
  retry: string;
}

export interface PickerBridge {
  ready: () => void;
  choose: (deviceId: string) => void;
  onState: (listener: (state: PickerState) => void) => void;
}

export interface ActivePicker {
  window: BrowserWindow;
  kind: PickerKind;
  devices: PickerDevice[];
  resolve: (deviceId: string) => void;
}

export interface SerialPortIdentity {
  deviceInstanceId?: string;
  device_instance_id?: string;
  vendorId?: string | number;
  vendor_id?: string | number;
  productId?: string | number;
  product_id?: string | number;
  serialNumber?: string;
  serial_number?: string;
}

export interface ScreenRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface CoverageApi {
  coveredRatio: (handle: Buffer) => number;
}

export type ScannerHelperMessage =
  | { type: "scanners"; scanners: DesktopDocumentScanner[] }
  | { type: "ready" }
  | {
      type: "page";
      pageIndex: number;
      filePath: string;
      paperSource?: string;
      scanWidthMm?: number;
      scanHeightMm?: number;
    }
  | { type: "error"; reason: DesktopDocumentScanErrorReason; message: string }
  | { type: "finished"; pageCount: number };

export interface ActiveDocumentScan {
  scanBatchId: string;
  webContents: WebContents;
  stop: () => void;
}

export interface StoredDocumentScanFolder {
  folderPath: string;
}

export interface DocumentScannerSession {
  sessionId: string;
  webContents: WebContents;
  feedCard: (
    request: DesktopDocumentScannerCaptureRequest,
  ) => Promise<DesktopDocumentScannerFeedResult>;
  close: () => void;
}
