import {
  PENDING_SCAN_SAVE_RETRY_DELAYS_MS,
  PENDING_SCAN_SAVE_RETRYABLE_STATUSES,
} from "./constants/scan-save.constant";

export function isRetryableScanSaveStatus(status: number): boolean {
  return (
    status >= 500 || PENDING_SCAN_SAVE_RETRYABLE_STATUSES.includes(status)
  );
}

export function pendingScanSaveRetryDelayMs(attempt: number): number {
  return PENDING_SCAN_SAVE_RETRY_DELAYS_MS[
    Math.min(attempt, PENDING_SCAN_SAVE_RETRY_DELAYS_MS.length - 1)
  ];
}
