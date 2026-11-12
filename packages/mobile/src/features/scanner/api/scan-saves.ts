import { ApiStatusError } from "@/lib/api/api-status-error";
import {
  getAuthHeaders,
  handleForbidden,
  trackMemberSeatLimit,
} from "@/lib/api/client";
import { API_BASE } from "@/lib/constants/config";
import {
  isRetryableScanSaveError,
  buildScanSaveRequest,
  SCAN_SAVE_ACCEPTED_STATUSES,
  throwIfMemberSeatLimit,
  type SortOnlyScanRequest,
} from "@magic-vault/shared";
import type { CardSaveResult, PendingScanSave } from "@/lib/interfaces/scanner";

export async function sendScanSave(
  save: PendingScanSave,
  isRetry: boolean,
): Promise<CardSaveResult> {
  const path = save.kind === "card" ? "cards" : "unmatched";
  const res = await fetch(
    `${API_BASE}/api/collections/${save.collectionGuid}/${path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await getAuthHeaders(save.orgId)),
      },
      body: JSON.stringify(
        buildScanSaveRequest(save.record, {
          deviceGuid: save.deviceGuid,
          isRetry,
        }),
      ),
    },
  );
  handleForbidden(res);
  await trackMemberSeatLimit(res, save.orgId);
  await throwIfMemberSeatLimit(res);
  if (res.ok || SCAN_SAVE_ACCEPTED_STATUSES.includes(res.status)) {
    return (await res.json()) as CardSaveResult;
  }
  throw new ApiStatusError(res.status);
}

export const isRetryableSaveError = isRetryableScanSaveError;

export async function sendSortOnlyScan(
  orgId: string | null,
  collectionGuid: string,
  record: SortOnlyScanRequest,
): Promise<CardSaveResult> {
  const response = await fetch(
    `${API_BASE}/api/collections/${collectionGuid}/cards/sorted`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await getAuthHeaders(orgId)),
      },
      body: JSON.stringify(record),
    },
  );
  handleForbidden(response);
  await trackMemberSeatLimit(response, orgId);
  await throwIfMemberSeatLimit(response);
  if (response.ok || response.status === 402)
    return response.json() as Promise<CardSaveResult>;
  throw new ApiStatusError(response.status);
}
