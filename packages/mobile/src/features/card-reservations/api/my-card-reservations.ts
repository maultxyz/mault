import {
  CLAIM_MY_CARD_RESERVATIONS_API_PATH,
  MY_CARD_RESERVATIONS_API_PATH,
  SEEN_MY_CARD_RESERVATION_ALERTS_API_PATH,
  SHARE_LINK_GUEST_KEY_HEADER,
  msUntilCardReservationHoldsLapse,
  type MyCardReservation,
  type Result,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";
import { tradeGuestKey } from "@/features/trade-offers/lib/guest-key";
import { ApiStatusError } from "@/lib/api/api-status-error";
import { apiRequest, unwrap, unwrapOr } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/session";
import { MY_CARD_RESERVATIONS_QUERY_KEY } from "@/lib/constants/card-reservations";
import { API_BASE } from "@/lib/constants/config";
import { QUERY_STALE_MS } from "@/lib/constants/query";
import type { MyCardReservationCancelTarget } from "@/lib/interfaces/card-reservations";

const claimsByUserId = new Map<string, Promise<void>>();

async function claimMyCardReservations(): Promise<void> {
  const accessToken = await getAccessToken();
  if (!accessToken) return;
  const response = await fetch(`${API_BASE}${CLAIM_MY_CARD_RESERVATIONS_API_PATH}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      [SHARE_LINK_GUEST_KEY_HEADER]: tradeGuestKey(),
    },
  });
  if (!response.ok) throw new ApiStatusError(response.status);
}

function claimMyCardReservationsOnce(userId: string): Promise<void> {
  const existing = claimsByUserId.get(userId);
  if (existing) return existing;
  const claim = claimMyCardReservations().catch(() => {
    claimsByUserId.delete(userId);
  });
  claimsByUserId.set(userId, claim);
  return claim;
}

export const myCardReservationsQueryKey = (userId: string | null) =>
  [MY_CARD_RESERVATIONS_QUERY_KEY, userId] as const;

export const myCardReservationsQueryOptions = (userId: string | null) =>
  queryOptions({
    queryKey: myCardReservationsQueryKey(userId),
    queryFn: async () => {
      if (userId) await claimMyCardReservationsOnce(userId);
      return unwrap(apiRequest<Result<MyCardReservation[]>>(MY_CARD_RESERVATIONS_API_PATH, { orgId: null }));
    },
    enabled: !!userId,
    staleTime: QUERY_STALE_MS,
    refetchInterval: (query) => msUntilCardReservationHoldsLapse(query.state.data),
  });

export function cancelMyCardReservations(target: MyCardReservationCancelTarget): Promise<null> {
  const path =
    target.kind === "request"
      ? `/requests/${encodeURIComponent(target.requestGuid)}`
      : `/${encodeURIComponent(target.reservationGuid)}`;
  return unwrapOr(
    apiRequest<Result<null>>(`${MY_CARD_RESERVATIONS_API_PATH}${path}`, {
      method: "DELETE",
      orgId: null,
    }),
    null,
  );
}

export function markMyCardReservationAlertsSeen(guids: string[]): Promise<null> {
  return unwrapOr(
    apiRequest<Result<null>>(SEEN_MY_CARD_RESERVATION_ALERTS_API_PATH, {
      method: "POST",
      body: { guids },
      orgId: null,
    }),
    null,
  );
}
