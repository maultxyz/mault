import { ApiStatusError } from "@/lib/api/api-status-error";
import { PENDING_SCAN_SAVE_RETRYABLE_STATUSES } from "@/lib/constants/scanner";

export function isRetryableScanSaveError(err: unknown): boolean {
  if (err instanceof ApiStatusError) {
    return (
      err.status >= 500 ||
      PENDING_SCAN_SAVE_RETRYABLE_STATUSES.includes(err.status)
    );
  }
  return true;
}
