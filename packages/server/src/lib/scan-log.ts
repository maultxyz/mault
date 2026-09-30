import { SHOW_SCAN_LOGS } from "./constants/logging";

export function scanLog(...args: unknown[]): void {
  if (SHOW_SCAN_LOGS) console.log(...args);
}
