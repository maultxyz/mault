import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  getAuthHeaders,
  handleForbidden,
} from "@/lib/api/client";
import type { AddManualCardRequest, CardCondition, CardScanOrigin, Collection, IdentifyUnmatchedCardRequest, MatchedScanDiagnostics, Result, ScannedCard, SortOnlyScanRequest, UnmatchedCard, UnmatchedCardsPage } from "@magic-vault/shared";
import { ApiStatusError } from "@/lib/api/api-status-error";
import type {
  CardSaveResult,
  ScanSaveOptions,
  UnmatchedSaveResult,
} from "@/lib/interfaces/scanner";
import { queryOptions } from "@tanstack/react-query";
import { API_BASE } from "@/lib/constants/api";
import type { CreateCollectionFormValues } from "@/schemas/collections.schema";
import { SCAN_SAVE_ACCEPTED_STATUSES } from "@magic-vault/shared";

export async function loadCollections(): Promise<Result<Collection[]>> {
  return apiGet<Result<Collection[]>>("/api/collections");
}

export const collectionsQueryOptions = queryOptions({
  queryKey: ["collections"] as const,
  queryFn: () => loadCollections().then((r) => r.data ?? []),
  staleTime: Infinity,
});

export async function createCollection(
  values: CreateCollectionFormValues,
): Promise<Result<Collection[]>> {
  return apiPost<Result<Collection[]>>("/api/collections", values);
}

export async function updateCollection(
  guid: string,
  name: string,
): Promise<Result<Collection[]>> {
  return apiPut<Result<Collection[]>>(`/api/collections/${guid}`, { name });
}

export async function checkCollectionName(
  name: string,
  excludeGuid?: string,
): Promise<Result<{ available: boolean }>> {
  const params = new URLSearchParams({ name });
  if (excludeGuid) params.set("excludeGuid", excludeGuid);
  return apiGet<Result<{ available: boolean }>>(
    `/api/collections/check-name?${params.toString()}`,
  );
}

export async function activateCollection(guid: string): Promise<Result<Collection[]>> {
  return apiPut<Result<Collection[]>>(`/api/collections/${guid}/active`);
}

export async function deleteCollection(guid: string): Promise<Result<Collection[]>> {
  return apiDelete<Result<Collection[]>>(`/api/collections/${guid}`);
}

export async function loadCardImage(
  guid: string,
  scanId: string,
): Promise<Result<{ capturedImageUrl?: string }>> {
  return apiGet<Result<{ capturedImageUrl?: string }>>(
    `/api/collections/${guid}/cards/${scanId}/image`,
  );
}

export async function loadCardDiagnostics(
  guid: string,
  scanId: string,
): Promise<Result<MatchedScanDiagnostics | null>> {
  return apiGet<Result<MatchedScanDiagnostics | null>>(
    `/api/collections/${guid}/cards/${scanId}/diagnostics`,
  );
}

export const cardScanOriginQueryOptions = (
  collectionGuid: string | undefined,
  scanId: string,
) =>
  queryOptions({
    queryKey: ["card-scan-origin", scanId] as const,
    queryFn: () =>
      apiGet<Result<CardScanOrigin | null>>(
        `/api/collections/${collectionGuid}/cards/${scanId}/origin`,
      ).then((r) => r.data ?? null),
    enabled: !!collectionGuid,
    staleTime: Infinity,
  });

async function scanSaveHeaders(orgId: string | null | undefined) {
  return {
    "Content-Type": "application/json",
    ...(await getAuthHeaders()),
    ...(orgId ? { "X-Org-Id": orgId } : {}),
  };
}

export async function addCollectionCard(
  guid: string,
  record: ScannedCard,
  { deviceGuid, orgId, isRetry }: ScanSaveOptions,
): Promise<CardSaveResult> {
  const res = await fetch(`${API_BASE}/api/collections/${guid}/cards`, {
    method: "POST",
    headers: await scanSaveHeaders(orgId),
    body: JSON.stringify({ ...record, deviceGuid, isRetry }),
  });
  await handleForbidden(res);
  if (res.ok || SCAN_SAVE_ACCEPTED_STATUSES.includes(res.status))
    return res.json();
  throw new ApiStatusError(res.status);
}

export async function recordSortOnlyScan(
  guid: string,
  request: SortOnlyScanRequest,
  orgId: string | null,
): Promise<CardSaveResult> {
  const res = await fetch(`${API_BASE}/api/collections/${guid}/cards/sorted`, {
    method: "POST",
    headers: await scanSaveHeaders(orgId),
    body: JSON.stringify(request),
  });
  await handleForbidden(res);
  if (res.ok || res.status === 402) return res.json();
  throw new ApiStatusError(res.status);
}

export async function updateCollectionCard(
  guid: string,
  scanId: string,
  card: ScannedCard["card"],
  binNumber?: number,
): Promise<Result<ScannedCard>> {
  return apiPut<Result<ScannedCard>>(`/api/collections/${guid}/cards/${scanId}`, {
    card,
    binNumber,
  });
}

export async function setCollectionCardBin(
  guid: string,
  scanId: string,
  binNumber: number,
): Promise<Result<ScannedCard>> {
  return apiPut<Result<ScannedCard>>(`/api/collections/${guid}/cards/${scanId}`, {
    binNumber,
  });
}

export async function confirmCollectionCard(
  guid: string,
  scanId: string,
): Promise<Result<ScannedCard>> {
  return apiPut<Result<ScannedCard>>(`/api/collections/${guid}/cards/${scanId}`, {
    confirmed: true,
  });
}

export async function markCollectionCardReviewed(
  guid: string,
  scanId: string,
): Promise<Result<ScannedCard>> {
  return apiPut<Result<ScannedCard>>(`/api/collections/${guid}/cards/${scanId}`, {
    reviewed: true,
  });
}

export async function setCollectionCardFoilType(
  guid: string,
  scanId: string,
  isFoil: boolean,
  foilType: string | null,
): Promise<Result<ScannedCard>> {
  return apiPut<Result<ScannedCard>>(`/api/collections/${guid}/cards/${scanId}`, {
    isFoil,
    foilType,
  });
}

export async function setCollectionCardCondition(
  guid: string,
  scanId: string,
  condition: CardCondition,
): Promise<Result<ScannedCard>> {
  return apiPut<Result<ScannedCard>>(`/api/collections/${guid}/cards/${scanId}`, {
    condition,
  });
}

export async function removeCollectionCard(
  guid: string,
  scanId: string,
): Promise<Result<null>> {
  return apiDelete<Result<null>>(`/api/collections/${guid}/cards/${scanId}`);
}

export async function removeCollectionCards(
  guid: string,
  scanIds: string[],
): Promise<Result<null>> {
  return apiPost<Result<null>>(`/api/collections/${guid}/cards/remove-bulk`, { scanIds });
}

export async function markCollectionCardsDownloaded(
  guid: string,
  scanIds: string[],
): Promise<Result<null>> {
  return apiPost<Result<null>>(`/api/collections/${guid}/cards/mark-downloaded`, { scanIds });
}

export async function setCollectionCardsCondition(
  guid: string,
  scanIds: string[],
  condition: CardCondition,
): Promise<Result<null>> {
  return apiPost<Result<null>>(`/api/collections/${guid}/cards/condition`, {
    scanIds,
    condition,
  });
}

export async function clearCollectionCards(guid: string): Promise<Result<null>> {
  return apiDelete<Result<null>>(`/api/collections/${guid}/cards`);
}

export async function releaseScanLock(guid: string): Promise<Result<null>> {
  return apiDelete<Result<null>>(`/api/collections/${guid}/scan-lock`);
}

export async function loadUnmatchedCards(
  guid: string,
  limit: number,
  offset = 0,
): Promise<Result<UnmatchedCardsPage>> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return apiGet<Result<UnmatchedCardsPage>>(
    `/api/collections/${guid}/unmatched?${params}`,
  );
}

export async function addUnmatchedCard(
  guid: string,
  record: UnmatchedCard,
  { deviceGuid, orgId, isRetry }: ScanSaveOptions,
): Promise<UnmatchedSaveResult> {
  const res = await fetch(`${API_BASE}/api/collections/${guid}/unmatched`, {
    method: "POST",
    headers: await scanSaveHeaders(orgId),
    body: JSON.stringify({ ...record, deviceGuid, isRetry }),
  });
  await handleForbidden(res);
  if (res.ok || res.status === 409) return res.json();
  throw new ApiStatusError(res.status);
}

export async function removeUnmatchedCard(
  guid: string,
  scanId: string,
): Promise<Result<null>> {
  return apiDelete<Result<null>>(`/api/collections/${guid}/unmatched/${scanId}`);
}

export function removeUnmatchedScan(
  guid: string,
  scanId: string,
): Promise<boolean> {
  return removeUnmatchedCard(guid, scanId)
    .then((result) => result.success)
    .catch(() => false);
}

export async function identifyUnmatchedCard(
  guid: string,
  scanId: string,
  request: IdentifyUnmatchedCardRequest,
): Promise<Result<ScannedCard>> {
  return apiPost<Result<ScannedCard>>(
    `/api/collections/${guid}/unmatched/${scanId}/identify`,
    request,
  );
}

export async function addManualCollectionCard(
  guid: string,
  request: AddManualCardRequest,
): Promise<Result<ScannedCard>> {
  return apiPost<Result<ScannedCard>>(
    `/api/collections/${guid}/cards/manual`,
    request,
  );
}
