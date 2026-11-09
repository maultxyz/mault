import { CardHoldRequestError } from "@/features/card-holds/lib/card-hold-request-error";
import { cardHoldGuestKey } from "@/features/card-holds/lib/guest-identity";
import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import { API_BASE } from "@/lib/constants/api";
import {
  CARD_HOLD_SHARE_LINK_PATHS,
  CARD_HOLDS_QUERY_KEY,
} from "@/lib/constants/share-links";
import type { CardHoldOwnerScope } from "@/lib/interfaces/card-holds";
import {
  CARD_HOLD_GUEST_KEY_HEADER,
  type CardHold,
  type CardHoldRequest,
  type CardHoldShareLinkKind,
  type PublicCardHold,
  type Result,
} from "@magic-vault/shared";

async function guestRequest<T>(
  kind: CardHoldShareLinkKind,
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; result: Result<T> }> {
  const params = new URLSearchParams({ token });
  const response = await fetch(
    `${API_BASE}${CARD_HOLD_SHARE_LINK_PATHS[kind]}${path}?${params}`,
    {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        [CARD_HOLD_GUEST_KEY_HEADER]: cardHoldGuestKey(),
      },
    },
  );
  return { status: response.status, result: await response.json() };
}

function throwUnlessSuccessful<T>({
  status,
  result,
}: {
  status: number;
  result: Result<T>;
}): Result<T> {
  if (!result.success) throw new CardHoldRequestError(status, result.message);
  return result;
}

export async function fetchPublicCardHolds(
  kind: CardHoldShareLinkKind,
  token: string,
): Promise<PublicCardHold[]> {
  const result = throwUnlessSuccessful(
    await guestRequest<PublicCardHold[]>(kind, token, "/holds"),
  );
  return result.data ?? [];
}

export async function placePublicCardHold(
  kind: CardHoldShareLinkKind,
  token: string,
  request: CardHoldRequest,
): Promise<void> {
  throwUnlessSuccessful(
    await guestRequest<null>(kind, token, "/holds", {
      method: "POST",
      body: JSON.stringify(request),
    }),
  );
}

export async function releasePublicCardHold(
  kind: CardHoldShareLinkKind,
  token: string,
  scanId: string,
): Promise<void> {
  throwUnlessSuccessful(
    await guestRequest<null>(kind, token, `/holds/${scanId}`, {
      method: "DELETE",
    }),
  );
}

export function ownerCardHoldsKey(scope: CardHoldOwnerScope) {
  return [CARD_HOLDS_QUERY_KEY, scope.kind, scope.guid] as const;
}

export async function fetchOwnerCardHolds(
  scope: CardHoldOwnerScope,
): Promise<CardHold[]> {
  const params = new URLSearchParams({
    [scope.kind === "collection" ? "collection" : "location"]: scope.guid,
  });
  const result = await apiGet<Result<CardHold[]>>(`/api/card-holds?${params}`);
  if (!result.success || !result.data) throw new Error(result.message);
  return result.data;
}

export async function approveCardHold(holdGuid: string): Promise<void> {
  const result = await apiPost<Result<null>>(`/api/card-holds/${holdGuid}/approve`);
  if (!result.success) throw new Error(result.message);
}

export async function releaseCardHold(holdGuid: string): Promise<void> {
  const result = await apiDelete<Result<null>>(`/api/card-holds/${holdGuid}`);
  if (!result.success) throw new Error(result.message);
}
