export type DesktopScannerCommand =
  | "pause"
  | "resume"
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

export interface DesktopBridge {
  setScannerButtons: (buttons: DesktopScannerButton[] | null) => void;
  notify: (notification: DesktopNotification) => void;
  getWindowState: () => Promise<DesktopWindowState>;
  onWindowState: (listener: (state: DesktopWindowState) => void) => () => void;
  showMainWindow: () => void;
  movePipWindowBy: (offset: DesktopWindowOffset) => void;
  onScannerCommand: (listener: (command: DesktopScannerCommand) => void) => () => void;
}
