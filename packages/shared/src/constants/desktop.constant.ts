import type {
  DesktopDocumentScanDriver,
  DesktopScannerCommand,
  DesktopScannerIcon,
} from "../interfaces/desktop.interface";

export const DESKTOP_SCANNER_COMMANDS: readonly DesktopScannerCommand[] = [
  "pause",
  "resume",
  "scan-card",
  "toggle-auto-feed",
  "clear-device",
];

export const DESKTOP_SCANNER_ICONS: readonly DesktopScannerIcon[] = [
  "pause",
  "play",
  "auto-feed-on",
  "auto-feed-off",
  "clear-device",
];

export const DESKTOP_PIP_FRAME_NAME = "mault-scanner-pip";

export const DESKTOP_DOCUMENT_SCAN_DRIVERS: readonly DesktopDocumentScanDriver[] = [
  "twain",
  "wia",
];
