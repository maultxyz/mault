import { ApiStatusError } from "@/lib/api/api-status-error";
import { isRetryableScanSaveStatus } from "@magic-vault/shared";

export function isRetryableScanSaveError(err: unknown): boolean {
  if (err instanceof ApiStatusError) {
    return isRetryableScanSaveStatus(err.status);
  }
  return true;
}
