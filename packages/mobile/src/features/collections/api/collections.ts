import { queryOptions } from "@tanstack/react-query";
import type { Collection, Result } from "@magic-vault/shared";
import { apiDelete, apiGet, apiPost, apiPut, unwrap } from "@/lib/api/client";
import { QUERY_STALE_MS } from "@/lib/constants/query";
import type { CreateCollectionValues } from "@/lib/interfaces/forms";

export const collectionsQueryOptions = (orgId: string | null) =>
  queryOptions({
    queryKey: ["collections", orgId] as const,
    queryFn: () => unwrap(apiGet<Result<Collection[]>>("/api/collections")),
    enabled: !!orgId,
    staleTime: QUERY_STALE_MS,
  });

export function setActiveCollection(guid: string): Promise<Collection[]> {
  return unwrap(apiPut<Result<Collection[]>>(`/api/collections/${guid}/active`));
}

export function createCollection(values: CreateCollectionValues): Promise<Collection[]> {
  return unwrap(apiPost<Result<Collection[]>>("/api/collections", values));
}

export function renameCollection(guid: string, name: string): Promise<Collection[]> {
  return unwrap(apiPut<Result<Collection[]>>(`/api/collections/${guid}`, { name }));
}

export function deleteCollection(guid: string): Promise<Collection[]> {
  return unwrap(apiDelete<Result<Collection[]>>(`/api/collections/${guid}`));
}

export function emptyCollection(guid: string): Promise<unknown> {
  return apiDelete<Result<null>>(`/api/collections/${guid}/cards`).then((result) => {
    if (!result.success) throw new Error(result.message ?? "Request failed.");
    return null;
  });
}

export function checkCollectionName(name: string, excludeGuid?: string): Promise<boolean> {
  const params = new URLSearchParams({ name });
  if (excludeGuid) params.set("excludeGuid", excludeGuid);
  return apiGet<Result<{ available: boolean }>>(`/api/collections/check-name?${params.toString()}`).then(
    (result) => result.data?.available ?? true,
  );
}
