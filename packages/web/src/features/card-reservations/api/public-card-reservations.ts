import { shareLinkGuestKey } from "@/features/trade-offers/lib/guest-identity";
import { API_BASE } from "@/lib/constants/api";
import {
  PUBLIC_CARD_RESERVATIONS_QUERY_KEY,
  PUBLIC_CARD_RESERVATIONS_STALE_MS,
} from "@/lib/constants/card-reservations";
import type { PublicCardsSource } from "@/lib/interfaces/public-cards";
import {
  SHARE_LINK_GUEST_KEY_HEADER,
  type CardReservationRequest,
  type CreatedCardReservations,
  type PublicCardReservations,
  type Result,
} from "@magic-vault/shared";
import { queryOptions } from "@tanstack/react-query";

function reservationsUrl(source: PublicCardsSource, path = ""): string {
  const query = new URLSearchParams(source.linkParams);
  return `${API_BASE}/api/public/${source.basePath}/reservations${path}?${query}`;
}

async function readResult<T>(response: Response): Promise<T> {
  const result: Result<T> = await response.json();
  if (!result.success || result.data === undefined) throw new Error(result.message);
  return result.data;
}

export const publicCardReservationsKey = (source: PublicCardsSource) =>
  [PUBLIC_CARD_RESERVATIONS_QUERY_KEY, source.basePath, source.linkParams] as const;

export const publicCardReservationsQueryOptions = (source: PublicCardsSource) =>
  queryOptions({
    queryKey: publicCardReservationsKey(source),
    queryFn: async () =>
      readResult<PublicCardReservations>(
        await fetch(reservationsUrl(source), {
          headers: { [SHARE_LINK_GUEST_KEY_HEADER]: shareLinkGuestKey() },
        }),
      ),
    staleTime: PUBLIC_CARD_RESERVATIONS_STALE_MS,
  });

export async function reserveCards(
  source: PublicCardsSource,
  request: CardReservationRequest,
): Promise<CreatedCardReservations> {
  return readResult<CreatedCardReservations>(
    await fetch(reservationsUrl(source), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [SHARE_LINK_GUEST_KEY_HEADER]: shareLinkGuestKey(),
      },
      body: JSON.stringify(request),
    }),
  );
}

export async function cancelCardReservation(
  source: PublicCardsSource,
  reservationGuid: string,
): Promise<null> {
  return readResult<null>(
    await fetch(reservationsUrl(source, `/${encodeURIComponent(reservationGuid)}`), {
      method: "DELETE",
      headers: { [SHARE_LINK_GUEST_KEY_HEADER]: shareLinkGuestKey() },
    }),
  );
}
