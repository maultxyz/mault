import { SHOW_SCAN_LOGS } from "@/lib/constants/scanner";

export function scanLog(...args: unknown[]): void {
  if (SHOW_SCAN_LOGS) console.log(...args);
}

export function scanWarn(...args: unknown[]): void {
  if (SHOW_SCAN_LOGS) console.warn(...args);
}
