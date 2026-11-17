import type {
  DesktopScannerCommand,
  DesktopScannerIcon,
} from "../interfaces/desktop.interface";

export const DESKTOP_SCANNER_COMMANDS: readonly DesktopScannerCommand[] = [
  "pause",
  "resume",
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
