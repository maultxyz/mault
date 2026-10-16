import { ApiStatusError } from "@/lib/api/api-status-error";
import { getAuthHeaders, handleForbidden } from "@/lib/api/client";
import { API_BASE } from "@/lib/constants/config";
import {
  PENDING_SCAN_SAVE_RETRYABLE_STATUSES,
  SCAN_SAVE_ACCEPTED_STATUSES,
} from "@/lib/constants/scanner";
import type { CardSaveResult, PendingScanSave } from "@/lib/interfaces/scanner";

export async function sendScanSave(save: PendingScanSave, isRetry: boolean): Promise<CardSaveResult> {
  const path = save.kind === "card" ? "cards" : "unmatched";
  const res = await fetch(`${API_BASE}/api/collections/${save.collectionGuid}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await getAuthHeaders(save.orgId)) },
    body: JSON.stringify({ ...save.record, deviceGuid: save.deviceGuid, isRetry }),
  });
  handleForbidden(res);
  if (res.ok || SCAN_SAVE_ACCEPTED_STATUSES.includes(res.status)) {
    return (await res.json()) as CardSaveResult;
  }
  throw new ApiStatusError(res.status);
}

export function isRetryableSaveError(err: unknown): boolean {
  if (err instanceof ApiStatusError) {
    return err.status >= 500 || PENDING_SCAN_SAVE_RETRYABLE_STATUSES.includes(err.status);
  }
  return true;
}
