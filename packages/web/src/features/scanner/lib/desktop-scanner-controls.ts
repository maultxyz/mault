import type {
  DesktopScannerButton,
  DesktopScannerCommand,
} from "@magic-vault/shared";

let owner: symbol | null = null;
let buttons: DesktopScannerButton[] | null = null;
let runner: ((command: DesktopScannerCommand) => void) | null = null;
const listeners = new Set<() => void>();

export function publishScannerControls(
  publisher: symbol,
  next: DesktopScannerButton[] | null,
  run: (command: DesktopScannerCommand) => void,
) {
  if (!next && owner !== publisher) return;
  owner = next ? publisher : null;
  buttons = next;
  runner = next ? run : null;
  window.maultDesktop?.setScannerButtons(next);
  for (const listener of listeners) listener();
}

export function subscribeScannerControls(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getScannerControls() {
  return buttons;
}

export function runScannerCommand(command: DesktopScannerCommand) {
  runner?.(command);
}
