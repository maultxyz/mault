import { apiDelete, apiGet, apiPost, unwrap } from "@/lib/api/client";
import { CARD_HOLDS_QUERY_KEY } from "@/lib/constants/share-links";
import type { ShareLinkKind } from "@/lib/interfaces/share-links";
import type { CardHold, Result } from "@magic-vault/shared";

export function cardHoldsKey(kind: ShareLinkKind, guid: string) {
  return [CARD_HOLDS_QUERY_KEY, kind, guid] as const;
}

export function fetchCardHolds(kind: ShareLinkKind, guid: string): Promise<CardHold[]> {
  const params = new URLSearchParams({ [kind === "collection" ? "collection" : "location"]: guid });
  return unwrap(apiGet<Result<CardHold[]>>(`/api/card-holds?${params}`));
}

async function throwUnlessSuccessful(request: Promise<Result<unknown>>): Promise<void> {
  const result = await request;
  if (!result.success) throw new Error(result.message);
}

export function approveCardHold(holdGuid: string): Promise<void> {
  return throwUnlessSuccessful(apiPost<Result<unknown>>(`/api/card-holds/${holdGuid}/approve`));
}

export function releaseCardHold(holdGuid: string): Promise<void> {
  return throwUnlessSuccessful(apiDelete<Result<unknown>>(`/api/card-holds/${holdGuid}`));
}
