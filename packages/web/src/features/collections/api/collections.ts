import { apiDelete, apiGet, apiPost, apiPut, getAuthHeaders, handleForbidden } from "@/lib/api/client";
import type { Collection, Result, ScannedCard } from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

export async function loadCollections(): Promise<Result<Collection[]>> {
  return apiGet<Result<Collection[]>>("/api/collections");
}

export const collectionsQueryOptions = queryOptions({
  queryKey: ["collections"] as const,
  queryFn: () => loadCollections().then((r) => r.data ?? []),
  staleTime: Infinity,
});

export async function createCollection(
  name: string,
  gameGuid: string,
  lang: string,
): Promise<Result<Collection[]>> {
  return apiPost<Result<Collection[]>>("/api/collections", {
    name,
    gameGuid,
    lang,
  });
}

export async function renameCollection(guid: string, name: string): Promise<Result<Collection[]>> {
  return apiPut<Result<Collection[]>>(`/api/collections/${guid}`, { name });
}

export async function activateCollection(guid: string): Promise<Result<Collection[]>> {
  return apiPut<Result<Collection[]>>(`/api/collections/${guid}/active`);
}

export async function deleteCollection(guid: string): Promise<Result<Collection[]>> {
  return apiDelete<Result<Collection[]>>(`/api/collections/${guid}`);
}

export async function loadCollectionCards(guid: string): Promise<Result<ScannedCard[]>> {
  return apiGet<Result<ScannedCard[]>>(`/api/collections/${guid}/cards`);
}

export async function loadCardImage(
  guid: string,
  scanId: string,
): Promise<Result<{ capturedImageUrl?: string }>> {
  return apiGet<Result<{ capturedImageUrl?: string }>>(
    `/api/collections/${guid}/cards/${scanId}/image`,
  );
}

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function addCollectionCard(
  guid: string,
  record: ScannedCard,
): Promise<Result<ScannedCard> & { scanLimitReached?: boolean }> {
  const res = await fetch(`${API_BASE}/api/collections/${guid}/cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
    body: JSON.stringify(record),
  });
  await handleForbidden(res);
  // Return body for success, 423 (locked), and 402 (free-plan scan limit reached)
  if (res.ok || res.status === 423 || res.status === 402) return res.json();
  throw new Error(`API error: ${res.status}`);
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

export async function setCollectionCardFoil(
  guid: string,
  scanId: string,
  isFoil: boolean,
): Promise<Result<ScannedCard>> {
  return apiPut<Result<ScannedCard>>(`/api/collections/${guid}/cards/${scanId}`, {
    isFoil,
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

export async function clearCollectionCards(guid: string): Promise<Result<null>> {
  return apiDelete<Result<null>>(`/api/collections/${guid}/cards`);
}

export async function releaseScanLock(guid: string): Promise<Result<null>> {
  return apiDelete<Result<null>>(`/api/collections/${guid}/scan-lock`);
}
