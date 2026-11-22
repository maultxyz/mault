import { shareLinkGuestKey } from "@/features/trade-offers/lib/guest-identity";
import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import { getAuthSession } from "@/lib/auth/session";
import { API_BASE } from "@/lib/constants/api";
import { guestCancelPath } from "@/features/card-reservations/lib/guest-cancel-key";
import { MY_CARD_RESERVATIONS_QUERY_KEY } from "@/lib/constants/card-reservations";
import type { GuestCardReservationCancelTarget } from "@/lib/interfaces/card-reservations";
import {
  CLAIM_MY_CARD_RESERVATIONS_API_PATH,
  MY_CARD_RESERVATIONS_API_PATH,
  SEEN_MY_CARD_RESERVATION_ALERTS_API_PATH,
  SHARE_LINK_GUEST_KEY_HEADER,
  type MyCardReservation,
  type Result,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

const claimedGuestKeysByUser = new Map<string, Promise<void>>();

async function claimMyCardReservations(): Promise<void> {
  const session = await getAuthSession();
  if (!session?.token) return;
  const response = await fetch(`${API_BASE}${CLAIM_MY_CARD_RESERVATIONS_API_PATH}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.token}`,
      [SHARE_LINK_GUEST_KEY_HEADER]: shareLinkGuestKey(),
    },
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
}

function claimMyCardReservationsOnce(userId: string): Promise<void> {
  const existing = claimedGuestKeysByUser.get(userId);
  if (existing) return existing;
  const claim = claimMyCardReservations().catch(() => {
    claimedGuestKeysByUser.delete(userId);
  });
  claimedGuestKeysByUser.set(userId, claim);
  return claim;
}

export const myCardReservationsQueryKey = (userId: string | undefined) =>
  [MY_CARD_RESERVATIONS_QUERY_KEY, userId] as const;

export const myCardReservationsQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: myCardReservationsQueryKey(userId),
    queryFn: async () => {
      if (userId) await claimMyCardReservationsOnce(userId);
      const result = await apiGet<Result<MyCardReservation[]>>(MY_CARD_RESERVATIONS_API_PATH);
      if (!result.success) throw new Error(result.message);
      return result.data ?? [];
    },
    enabled: !!userId,
  });

export function cancelMyCardReservations(
  target: GuestCardReservationCancelTarget,
): Promise<Result<null>> {
  return apiDelete<Result<null>>(`${MY_CARD_RESERVATIONS_API_PATH}${guestCancelPath(target)}`);
}

export function markMyCardReservationAlertsSeen(guids: string[]): Promise<Result<null>> {
  return apiPost<Result<null>>(SEEN_MY_CARD_RESERVATION_ALERTS_API_PATH, { guids });
}
